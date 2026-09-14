import type Fuse from "fuse.js";
import type { Resource } from "@/lib/resources";

export type DirectoryFilters = {
  search: string;
  category: string[];
  region: string; // "all" | "IN"
  costType: string[];
  tags: string[];
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
  if (skip !== "region" && filters.region !== "all") {
    list = list.filter((r) => r.region === filters.region);
  }
  if (skip !== "costType" && filters.costType.length) {
    list = list.filter((r) => filters.costType.includes(r.costType));
  }
  if (skip !== "tags" && filters.tags.length) {
    list = list.filter((r) => filters.tags.every((tag) => r.tags.includes(tag)));
  }
  if (skip !== "search" && filters.search.trim()) {
    const matchIds = new Set(fuse.search(filters.search).map((m) => m.item.id));
    list = list.filter((r) => matchIds.has(r.id));
  }
  return list;
}

export function countByCategory(resources: Resource[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const r of resources) counts[r.categorySlug] = (counts[r.categorySlug] ?? 0) + 1;
  return counts;
}

export function topTags(resources: Resource[], limit: number): string[] {
  const counts = new Map<string, number>();
  for (const r of resources) {
    for (const tag of r.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([tag]) => tag);
}

if (process.argv[1] && process.argv[1].endsWith("directory-filters.ts")) {
  const fixture: Resource[] = [
    { id: 1, slug: "a", name: "A", tagline: null, description: "", url: null, hasStaticClaimUrl: false, categoryId: 1, categorySlug: "ai", categoryName: "AI", categoryIcon: "🤖", tags: ["Web"], region: "IN", costType: "free", status: "active", lastVerifiedAt: null },
    { id: 2, slug: "b", name: "B", tagline: null, description: "", url: null, hasStaticClaimUrl: false, categoryId: 2, categorySlug: "dev", categoryName: "Dev", categoryIcon: "🛠️", tags: ["Web"], region: "Global", costType: "discount", status: "active", lastVerifiedAt: null },
    { id: 3, slug: "c", name: "C", tagline: null, description: "", url: null, hasStaticClaimUrl: false, categoryId: 1, categorySlug: "ai", categoryName: "AI", categoryIcon: "🤖", tags: ["iOS"], region: "IN", costType: "free", status: "active", lastVerifiedAt: null },
  ];
  const dummyFuse = { search: () => [] } as unknown as Fuse<Resource>;
  const noFilters: DirectoryFilters = { search: "", category: [], region: "all", costType: [], tags: [] };

  console.assert(applyFilters(fixture, noFilters, dummyFuse).length === 3, "no filters should return everything");

  const withCategory: DirectoryFilters = { ...noFilters, category: ["ai"] };
  console.assert(applyFilters(fixture, withCategory, dummyFuse).length === 2, "category filter should narrow to 2");

  // The whole point of `skip`: counting categories should ignore the
  // category filter itself but still respect other active filters.
  const withRegionAndCategory: DirectoryFilters = { ...noFilters, region: "IN", category: ["dev"] };
  const forCounts = applyFilters(fixture, withRegionAndCategory, dummyFuse, "category");
  console.assert(forCounts.length === 2, "skipping category should still apply the region filter");

  const counts = countByCategory(fixture);
  console.assert(counts["ai"] === 2 && counts["dev"] === 1, `unexpected counts: ${JSON.stringify(counts)}`);

  console.assert(
    JSON.stringify(topTags(fixture, 1)) === JSON.stringify(["Web"]),
    "Web appears twice, should be the top tag",
  );

  console.log("OK: directory-filters.ts self-check passed");
}
