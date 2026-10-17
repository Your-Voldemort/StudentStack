import type Fuse from "fuse.js";
import type { Resource, ResourceKind } from "@/lib/resources";

export type RegionFilter = "all" | "IN" | "Global";

// Phase 1 opportunity kinds (issue #81). A resource without a kind predates
// the field and counts as a plain perk everywhere (filters, facet counts).
export const RESOURCE_KINDS: readonly ResourceKind[] = [
  "perk",
  "scholarship",
  "fellowship",
  "internship",
  "mentorship",
  "program",
];

export function resourceKind(r: Pick<Resource, "kind">): ResourceKind {
  return r.kind ?? "perk";
}

// "Works in India" (issue #74): an offer works for Indian students when it
// explicitly includes India in its preserved regions, or when it isn't
// locked to specific foreign geographies (truly worldwide/unrestricted
// offers). A US/UK/EU-only offer is regionLocked without IN in regions,
// so it correctly does NOT match.
export function worksInIndia(r: Pick<Resource, "region" | "regions" | "regionLocked">): boolean {
  return r.regions.includes("IN") || !r.regionLocked || r.region === "IN";
}

export type DirectoryFilters = {
  search: string;
  category: string[];
  region: RegionFilter;
  kind: string[];
  costType: string[];
  tags: string[];
  verificationNeeded: string[];
  creditCardRequired: string[]; // "yes" | "no"
  duration: string[];
};

// `skip` excludes one dimension from filtering — used to compute faceted
// counts for that dimension (e.g. category counts that reflect every OTHER
// active filter, but not the category selection itself).
export function applyFilters(
  resources: Resource[],
  filters: DirectoryFilters,
  fuse: Fuse<Resource>,
  skip?: keyof DirectoryFilters,
): Resource[] {
  let list = resources;
  if (skip !== "category" && filters.category.length) {
    list = list.filter((r) => filters.category.includes(r.categorySlug));
  }
  if (skip !== "region" && filters.region !== "all") {    // "IN" means "works in India" (India-exclusive + worldwide offers);
    // "Global" means truly worldwide (not locked to any geography), so
    // US/UK/EU-only offers appear under neither facet.
    list = list.filter((r) => (filters.region === "IN" ? worksInIndia(r) : !r.regionLocked));
  }
  if (skip !== "kind" && filters.kind.length) {
    list = list.filter((r) => filters.kind.includes(resourceKind(r)));
  }
  if (skip !== "costType" && filters.costType.length) {
    list = list.filter((r) => filters.costType.includes(r.costType));
  }
  if (skip !== "tags" && filters.tags.length) {
    list = list.filter((r) => filters.tags.every((tag) => r.tags.includes(tag)));
  }
  if (skip !== "verificationNeeded" && filters.verificationNeeded.length) {
    list = list.filter(
      (r) => r.verificationNeeded && filters.verificationNeeded.includes(r.verificationNeeded),
    );
  }
  if (skip !== "creditCardRequired" && filters.creditCardRequired.length) {
    list = list.filter((r) => {
      if (r.creditCardRequired === null) return false;
      return filters.creditCardRequired.includes(r.creditCardRequired ? "yes" : "no");
    });
  }
  if (skip !== "duration" && filters.duration.length) {
    list = list.filter((r) => r.duration && filters.duration.includes(r.duration));
  }
  if (skip !== "search" && filters.search.trim()) {
    const searchResults = fuse.search(filters.search);
    const orderMap = new Map(searchResults.map((m, idx) => [m.item.id, idx]));
    list = list
      .filter((r) => orderMap.has(r.id))
      .sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0));
  }
  return list;
}

export function countByCategory(resources: Resource[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const r of resources) counts[r.categorySlug] = (counts[r.categorySlug] ?? 0) + 1;
  return counts;
}

// Facet counts for the kind chip row (issue #81): kind-less resources count
// as "perk", mirroring applyFilters.
export function countByKind(resources: Resource[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const r of resources) {
    const kind = resourceKind(r);
    counts[kind] = (counts[kind] ?? 0) + 1;
  }
  return counts;
}

export function topTags(resources: Resource[], limit: number): string[] {
  const counts = new Map<string, number>();
  for (const r of resources) {
    for (const tag of r.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([tag]) => tag);
}

export function countByCostType(resources: Resource[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const r of resources) counts[r.costType] = (counts[r.costType] ?? 0) + 1;
  return counts;
}

// "in" = works in India (India-exclusive + worldwide), "global" = truly
// worldwide (not region-locked), "all" = every resource — region-locked
// foreign offers (e.g. US-only) appear only under "all".
export function countByRegion(resources: Resource[]): { in: number; global: number; all: number } {
  let inCount = 0;
  let globalCount = 0;
  for (const r of resources) {
    if (worksInIndia(r)) inCount++;
    if (!r.regionLocked) globalCount++;
  }
  return { in: inCount, global: globalCount, all: resources.length };
}

export type SortOption = "relevance" | "verified" | "name-asc" | "name-desc" | "free-first";

export type LinkStatusRank = "active" | "broken" | "expired";

// Issue #76: broken links sink below healthy ones everywhere they are
// listed; expired sits at the very bottom.
const LINK_STATUS_RANK: Record<LinkStatusRank, number> = {
  active: 0,
  broken: 1,
  expired: 2,
};

export function statusRank(status: Resource["status"]): number {
  return LINK_STATUS_RANK[status] ?? 0;
}

// Stable demotion pass: active first, broken after, expired last — the
// within-status order (relevance, name, ...) is preserved.
export function demoteBroken(resources: Resource[]): Resource[] {
  return [...resources].sort((a, b) => statusRank(a.status) - statusRank(b.status));
}

export function sortResources(
  resources: Resource[],
  sort: SortOption,
  hasSearchQuery: boolean,
): Resource[] {
  if (sort === "relevance" && hasSearchQuery) {
    // Keep search relevance order, but still demote broken links below
    // active ones (issue #76). Array.prototype.sort is stable, so relevance
    // order within each status is preserved.
    return demoteBroken(resources);
  }
  // Issue #76: `status === "broken"` always sorts after `status ===
  // "active"` (and `expired` at the very bottom), in every sort mode —
  // so it is the primary key and each mode's comparator is the tiebreak.
  const byStatus = (a: Resource, b: Resource) => statusRank(a.status) - statusRank(b.status);
  const copy = [...resources];
  switch (sort) {
    case "verified":
      return copy.sort(
        (a, b) => byStatus(a, b) || (b.lastVerifiedAt ?? 0) - (a.lastVerifiedAt ?? 0),
      );
    case "name-asc":
      return copy.sort(
        (a, b) => byStatus(a, b) || a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
      );
    case "name-desc":
      return copy.sort(
        (a, b) => byStatus(a, b) || b.name.localeCompare(a.name, undefined, { sensitivity: "base" }),
      );
    case "free-first":
      return copy.sort((a, b) => {
        const freeRank = (r: Resource) => (r.costType === "free" ? 0 : 1);
        return (
          byStatus(a, b) ||
          freeRank(a) - freeRank(b) ||
          a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
        );
      });
    default:
      return demoteBroken(resources);
  }
}

if (process.argv[1] && process.argv[1].endsWith("directory-filters.ts")) {
  const fixture: Resource[] = [
    { id: 1, slug: "a", name: "A", tagline: null, description: "", url: null, hasStaticClaimUrl: false, categoryId: 1, categorySlug: "ai", categoryName: "AI", categoryIcon: "🤖", tags: ["Web"], region: "IN", regions: ["IN"], regionLocked: true, costType: "free", verificationNeeded: null, creditCardRequired: null, duration: null, status: "active", lastVerifiedAt: null, deadline: null, kind: "scholarship" },
    { id: 2, slug: "b", name: "B", tagline: null, description: "", url: null, hasStaticClaimUrl: false, categoryId: 2, categorySlug: "dev", categoryName: "Dev", categoryIcon: "🛠️", tags: ["Web"], region: "Global", regions: [], regionLocked: false, costType: "discount", verificationNeeded: null, creditCardRequired: null, duration: null, status: "active", lastVerifiedAt: null, deadline: null, kind: "internship" },
    { id: 3, slug: "c", name: "C", tagline: null, description: "", url: null, hasStaticClaimUrl: false, categoryId: 1, categorySlug: "ai", categoryName: "AI", categoryIcon: "🤖", tags: ["iOS"], region: "IN", regions: ["IN"], regionLocked: true, costType: "free", verificationNeeded: null, creditCardRequired: null, duration: null, status: "active", lastVerifiedAt: null, deadline: null },
    { id: 4, slug: "d", name: "D", tagline: null, description: "", url: null, hasStaticClaimUrl: false, categoryId: 2, categorySlug: "dev", categoryName: "Dev", categoryIcon: "🛠️", tags: ["Web"], region: "Global", regions: ["US"], regionLocked: true, costType: "free", verificationNeeded: null, creditCardRequired: null, duration: null, status: "active", lastVerifiedAt: null, deadline: null },
  ];
  const dummyFuse = { search: () => [] } as unknown as Fuse<Resource>;
  const noFilters: DirectoryFilters = {
    search: "",
    category: [],
    region: "all",
    kind: [],
    costType: [],
    tags: [],
    verificationNeeded: [],
    creditCardRequired: [],
    duration: [],
  };

  console.assert(applyFilters(fixture, noFilters, dummyFuse).length === 4, "no filters should return everything");

  const withCategory: DirectoryFilters = { ...noFilters, category: ["ai"] };
  console.assert(applyFilters(fixture, withCategory, dummyFuse).length === 2, "category filter should narrow to 2");

  // The whole point of `skip`: counting categories should ignore the
  // category filter itself but still respect other active filters.
  const withRegionAndCategory: DirectoryFilters = { ...noFilters, region: "IN", category: ["dev"] };
  const forCounts = applyFilters(fixture, withRegionAndCategory, dummyFuse, "category");
  console.assert(forCounts.length === 3, "skipping category should still apply the region filter (IN-exclusive + worldwide, not US-only)");

  const counts = countByCategory(fixture);
  console.assert(counts["ai"] === 2 && counts["dev"] === 2, `unexpected counts: ${JSON.stringify(counts)}`);

  console.assert(
    JSON.stringify(topTags(fixture, 1)) === JSON.stringify(["Web"]),
    "Web appears twice, should be the top tag",
  );

  const withVerification: DirectoryFilters = { ...noFilters, verificationNeeded: ["edu_email"] };
  console.assert(
    applyFilters(fixture, withVerification, dummyFuse).length === 0,
    "fixture resources have no verificationNeeded set, so this should match nothing",
  );

  const withGlobalRegion: DirectoryFilters = { ...noFilters, region: "Global" };
  console.assert(applyFilters(fixture, withGlobalRegion, dummyFuse).length === 1, "global region should narrow to the truly worldwide offer only (US-only excluded)");

  const withIndiaRegion: DirectoryFilters = { ...noFilters, region: "IN" };
  const indiaResults = applyFilters(fixture, withIndiaRegion, dummyFuse);
  console.assert(indiaResults.length === 3, "IN region should match India-exclusive + worldwide offers");
  console.assert(
    indiaResults.every((r) => worksInIndia(r)) && !indiaResults.some((r) => r.slug === "d"),
    "US-only offer must not appear as available in India",
  );

  const regionCounts = countByRegion(fixture);
  console.assert(regionCounts.in === 3 && regionCounts.global === 1 && regionCounts.all === 4, "region counts should match fixture");

  // Kind filtering (issue #81): kind-less resources count as "perk".
  const withKind: DirectoryFilters = { ...noFilters, kind: ["scholarship", "fellowship"] };
  const kindResults = applyFilters(fixture, withKind, dummyFuse);
  console.assert(kindResults.length === 1 && kindResults[0].slug === "a", "kind filter should match the scholarship only");

  const withKindAndRegion: DirectoryFilters = { ...noFilters, kind: ["perk"], region: "IN" };
  const kindCounts = countByKind(applyFilters(fixture, withKindAndRegion, dummyFuse, "kind"));
  console.assert(
    kindCounts["perk"] === 1 && kindCounts["scholarship"] === 1 && kindCounts["internship"] === 1,
    `unexpected kind counts: ${JSON.stringify(kindCounts)}`,
  );

  console.log("OK: directory-filters.ts self-check passed");
}
