import { describe, it, expect, vi } from "vitest";
import Fuse from "fuse.js";
import {
  applyFilters,
  countByCategory,
  countByCostType,
  countByKind,
  countByRegion,
  demoteBroken,
  resourceKind,
  statusRank,
  topTags,
  sortResources,
  worksInIndia,
  type DirectoryFilters,
  type SortOption,
} from "./directory-filters";
import type { Resource } from "./resources";

const sampleResources: Resource[] = [
  {
    id: 1,
    slug: "tool-in",
    name: "Alpha Tool",
    tagline: "India developer tool",
    description: "Great developer tool for Indian students",
    url: "https://example.com/alpha",
    hasStaticClaimUrl: false,
    categoryId: 1,
    categorySlug: "developer-tools",
    categoryName: "Developer Tools",
    categoryIcon: "🛠️",
    tags: ["Web", "DevOps"],
    region: "IN",
    regions: ["IN"],
    regionLocked: true,
    costType: "free",
    verificationNeeded: "edu_email",
    creditCardRequired: false,
    duration: "one_year",
    status: "active",
    lastVerifiedAt: 1700000000,
    deadline: null,
  },
  {
    id: 2,
    slug: "tool-global",
    name: "Beta Global Cloud",
    tagline: "Worldwide cloud hosting",
    description: "Global cloud platform with student credits",
    url: "https://example.com/beta",
    hasStaticClaimUrl: false,
    categoryId: 2,
    categorySlug: "cloud-and-hosting",
    categoryName: "Cloud & Hosting",
    categoryIcon: "☁️",
    tags: ["Web", "Cloud"],
    region: "Global",
    regions: [],
    regionLocked: false,
    costType: "credits",
    verificationNeeded: "github_student_pack",
    creditCardRequired: true,
    duration: "while_student",
    status: "active",
    lastVerifiedAt: 1700005000,
    deadline: null,
  },
  {
    id: 3,
    slug: "tool-design-global",
    name: "Gamma Studio",
    tagline: "Global creative suite",
    description: "Creative design suite for worldwide students",
    url: "https://example.com/gamma",
    hasStaticClaimUrl: false,
    categoryId: 3,
    categorySlug: "design-and-creative",
    categoryName: "Design & Creative",
    categoryIcon: "🎨",
    tags: ["Design", "macOS"],
    region: "Global",
    regions: [],
    regionLocked: false,
    costType: "discount",
    verificationNeeded: "student_id",
    creditCardRequired: null,
    duration: null,
    status: "active",
    lastVerifiedAt: 1700010000,
    deadline: null,
  },
  {
    id: 4,
    slug: "tool-ai-in",
    name: "Delta AI",
    tagline: "AI assistant for Indian learners",
    description: "Free AI computing for students in India",
    url: "https://example.com/delta",
    hasStaticClaimUrl: false,
    categoryId: 4,
    categorySlug: "ai-and-machine-learning",
    categoryName: "AI & ML",
    categoryIcon: "🤖",
    tags: ["AI", "Web"],
    region: "IN",
    regions: ["IN"],
    regionLocked: true,
    costType: "free",
    verificationNeeded: null,
    creditCardRequired: null,
    duration: "lifetime",
    status: "active",
    lastVerifiedAt: null,
    deadline: null,
  },
  {
    id: 5,
    slug: "tool-us-only",
    name: "Epsilon US",
    tagline: "US-only student discount",
    description: "Discount available to students in the United States only",
    url: "https://example.com/epsilon",
    hasStaticClaimUrl: false,
    categoryId: 2,
    categorySlug: "cloud-and-hosting",
    categoryName: "Cloud & Hosting",
    categoryIcon: "☁️",
    tags: ["Web"],
    region: "Global",
    regions: ["US"],
    regionLocked: true,
    costType: "free",
    verificationNeeded: null,
    creditCardRequired: null,
    duration: null,
    status: "active",
    lastVerifiedAt: null,
    deadline: null,
  },
];

const defaultFilters: DirectoryFilters = {
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

const createFuse = (items: Resource[]) =>
  new Fuse(items, {
    keys: ["name", "tagline", "description", "tags"],
    threshold: 0.35,
  });

describe("directory-filters region filtering", () => {
  const fuse = createFuse(sampleResources);

  it("returns all resources when region is 'all'", () => {
    const results = applyFilters(sampleResources, { ...defaultFilters, region: "all" }, fuse);
    expect(results).toHaveLength(5);
  });

  it("filters to resources that work in India when region is 'IN'", () => {
    const results = applyFilters(sampleResources, { ...defaultFilters, region: "IN" }, fuse);
    // India-exclusive + worldwide offers; the US-only offer is excluded.
    expect(results).toHaveLength(4);
    expect(results.map((r) => r.slug)).toEqual([
      "tool-in",
      "tool-global",
      "tool-design-global",
      "tool-ai-in",
    ]);
  });

  it("excludes US-only offers from the India facet (issue #74)", () => {
    const results = applyFilters(
      sampleResources,
      { ...defaultFilters, region: "IN", costType: ["free"] },
      fuse,
    );
    expect(results.map((r) => r.slug).sort()).toEqual(["tool-ai-in", "tool-in"]);
  });

  it("filters to only truly worldwide resources when region is 'Global'", () => {
    const results = applyFilters(sampleResources, { ...defaultFilters, region: "Global" }, fuse);
    // Region-locked foreign offers (e.g. US-only) are no longer collapsed
    // into "Global".
    expect(results).toHaveLength(2);
    expect(results.every((r) => !r.regionLocked)).toBe(true);
    expect(results.map((r) => r.slug)).toEqual(["tool-global", "tool-design-global"]);
  });

  it("skips region filtering when skip is 'region'", () => {
    const results = applyFilters(
      sampleResources,
      { ...defaultFilters, region: "IN", costType: ["free"] },
      fuse,
      "region",
    );
    expect(results).toHaveLength(3);
    expect(results.every((r) => r.costType === "free")).toBe(true);
  });
});

describe("worksInIndia", () => {
  it("is true for India-exclusive offers", () => {
    expect(worksInIndia(sampleResources[0])).toBe(true);
  });

  it("is true for worldwide (unrestricted) offers", () => {
    expect(worksInIndia(sampleResources[1])).toBe(true);
  });

  it("is false for foreign-locked offers", () => {
    expect(worksInIndia(sampleResources[4])).toBe(false);
  });
});

describe("resourceKind", () => {
  it("returns the resource kind when set", () => {
    expect(resourceKind({ kind: "scholarship" })).toBe("scholarship");
    expect(resourceKind({ kind: "internship" })).toBe("internship");
  });

  it("defaults kind-less resources to 'perk'", () => {
    expect(resourceKind({})).toBe("perk");
    expect(resourceKind({ kind: undefined })).toBe("perk");
  });
});

describe("directory-filters kind filtering (issue #81)", () => {
  const withKind: Resource[] = [
    { ...sampleResources[0], kind: "scholarship" },
    { ...sampleResources[1], kind: "internship" },
    { ...sampleResources[2], kind: "program" },
    { ...sampleResources[3] }, // kind-less → counts as "perk"
    { ...sampleResources[4], kind: "fellowship" },
  ];
  const kindFuse = createFuse(withKind);

  it("returns everything when kind is empty", () => {
    const results = applyFilters(withKind, { ...defaultFilters, kind: [] }, kindFuse);
    expect(results).toHaveLength(5);
  });

  it("filters to the selected kinds, treating kind-less resources as perks", () => {
    const results = applyFilters(withKind, { ...defaultFilters, kind: ["perk"] }, kindFuse);
    expect(results.map((r) => r.slug)).toEqual(["tool-ai-in"]);
  });

  it("supports multi-kind selections (the Scholarships chip)", () => {
    const results = applyFilters(
      withKind,
      { ...defaultFilters, kind: ["scholarship", "fellowship"] },
      kindFuse,
    );
    expect(results.map((r) => r.slug).sort()).toEqual(["tool-in", "tool-us-only"]);
  });

  it("skips kind filtering when skip is 'kind' (faceted counts)", () => {
    const results = applyFilters(
      withKind,
      { ...defaultFilters, kind: ["perk"], region: "IN" },
      kindFuse,
      "kind",
    );
    // Region still applies (US-only excluded); the kind selection is ignored.
    expect(results).toHaveLength(4);
  });

  it("combines with other active filters", () => {
    const results = applyFilters(
      withKind,
      { ...defaultFilters, kind: ["program"], costType: ["discount"] },
      kindFuse,
    );
    expect(results.map((r) => r.slug)).toEqual(["tool-design-global"]);
  });
});

describe("countByKind", () => {
  const withKind: Resource[] = [
    { ...sampleResources[0], kind: "scholarship" },
    { ...sampleResources[1], kind: "internship" },
    { ...sampleResources[2], kind: "program" },
    { ...sampleResources[3] }, // kind-less → "perk"
    { ...sampleResources[4], kind: "fellowship" },
  ];

  it("counts each kind, defaulting kind-less resources to perk", () => {
    expect(countByKind(withKind)).toEqual({
      scholarship: 1,
      internship: 1,
      program: 1,
      perk: 1,
      fellowship: 1,
    });
  });

  it("returns an empty object for no resources", () => {
    expect(countByKind([])).toEqual({});
  });

  it("counts multiple resources of the same kind", () => {
    expect(countByKind([...withKind, { ...sampleResources[0], kind: "scholarship" }]).scholarship).toBe(2);
  });
});

describe("countByRegion", () => {  it("counts works-in-India, worldwide, and total accurately for mixed resources", () => {
    const counts = countByRegion(sampleResources);
    expect(counts).toEqual({
      in: 4,
      global: 2,
      all: 5,
    });
  });

  it("handles empty array cleanly", () => {
    const counts = countByRegion([]);
    expect(counts).toEqual({
      in: 0,
      global: 0,
      all: 0,
    });
  });

  it("handles only worldwide resources", () => {
    const worldwideOnly = sampleResources.filter((r) => !r.regionLocked);
    const counts = countByRegion(worldwideOnly);
    expect(counts).toEqual({
      in: 2,
      global: 2,
      all: 2,
    });
  });

  it("handles only IN resources", () => {
    const inOnly = sampleResources.filter((r) => r.region === "IN");
    const counts = countByRegion(inOnly);
    expect(counts).toEqual({
      in: 2,
      global: 0,
      all: 2,
    });
  });

  it("counts the US-only offer under all but neither facet", () => {
    const usOnly = sampleResources.filter((r) => r.slug === "tool-us-only");
    const counts = countByRegion(usOnly);
    expect(counts).toEqual({
      in: 0,
      global: 0,
      all: 1,
    });
  });
});

describe("directory-filters other filter dimensions", () => {
  const fuse = createFuse(sampleResources);

  it("filters by category", () => {
    const results = applyFilters(
      sampleResources,
      { ...defaultFilters, category: ["developer-tools"] },
      fuse,
    );
    expect(results).toHaveLength(1);
    expect(results[0].slug).toBe("tool-in");
  });

  it("skips category when skip is 'category'", () => {
    const results = applyFilters(
      sampleResources,
      { ...defaultFilters, category: ["developer-tools"], region: "Global" },
      fuse,
      "category",
    );
    expect(results).toHaveLength(2);
    expect(results.every((r) => r.region === "Global")).toBe(true);
  });

  it("filters by costType", () => {
    const results = applyFilters(
      sampleResources,
      { ...defaultFilters, costType: ["credits"] },
      fuse,
    );
    expect(results).toHaveLength(1);
    expect(results[0].slug).toBe("tool-global");
  });

  it("filters by tags (all tags must match)", () => {
    const results = applyFilters(
      sampleResources,
      { ...defaultFilters, tags: ["Web", "DevOps"] },
      fuse,
    );
    expect(results).toHaveLength(1);
    expect(results[0].slug).toBe("tool-in");
  });

  it("filters by verificationNeeded", () => {
    const results = applyFilters(
      sampleResources,
      { ...defaultFilters, verificationNeeded: ["github_student_pack"] },
      fuse,
    );
    expect(results).toHaveLength(1);
    expect(results[0].slug).toBe("tool-global");
  });

  it("filters by creditCardRequired yes and no", () => {
    const noResults = applyFilters(
      sampleResources,
      { ...defaultFilters, creditCardRequired: ["no"] },
      fuse,
    );
    expect(noResults).toHaveLength(1);
    expect(noResults[0].slug).toBe("tool-in");

    const yesResults = applyFilters(
      sampleResources,
      { ...defaultFilters, creditCardRequired: ["yes"] },
      fuse,
    );
    expect(yesResults).toHaveLength(1);
    expect(yesResults[0].slug).toBe("tool-global");
  });

  it("filters by duration", () => {
    const results = applyFilters(
      sampleResources,
      { ...defaultFilters, duration: ["one_year"] },
      fuse,
    );
    expect(results).toHaveLength(1);
    expect(results[0].slug).toBe("tool-in");
  });

  it("filters by search query using fuse", () => {
    const results = applyFilters(
      sampleResources,
      { ...defaultFilters, search: "Alpha" },
      fuse,
    );
    expect(results).toHaveLength(1);
    expect(results[0].slug).toBe("tool-in");
  });
});

describe("aggregation helpers", () => {
  it("counts by category correctly", () => {
    const counts = countByCategory(sampleResources);
    expect(counts["developer-tools"]).toBe(1);
    expect(counts["cloud-and-hosting"]).toBe(2);
  });

  it("counts by costType correctly", () => {
    const counts = countByCostType(sampleResources);
    expect(counts["free"]).toBe(3);
    expect(counts["credits"]).toBe(1);
    expect(counts["discount"]).toBe(1);
  });

  it("extracts top tags sorted by frequency", () => {
    const tags = topTags(sampleResources, 2);
    expect(tags[0]).toBe("Web");
    expect(tags).toHaveLength(2);
  });
});

describe("sortResources", () => {
  it("returns search relevance order unchanged when sort is 'relevance' and query is present", () => {
    const sorted = sortResources(sampleResources, "relevance", true);
    expect(sorted).toEqual(sampleResources);
  });

  it("sorts by verified date descending", () => {
    const sorted = sortResources(sampleResources, "verified", false);
    expect(sorted[0].slug).toBe("tool-design-global");
    expect(sorted[1].slug).toBe("tool-global");
  });

  it("sorts alphabetically ascending by name", () => {
    const sorted = sortResources(sampleResources, "name-asc", false);
    expect(sorted[0].name).toBe("Alpha Tool");
    expect(sorted[sorted.length - 1].name).toBe("Gamma Studio");
  });

  it("sorts alphabetically descending by name", () => {
    const sorted = sortResources(sampleResources, "name-desc", false);
    expect(sorted[0].name).toBe("Gamma Studio");
    expect(sorted[sorted.length - 1].name).toBe("Alpha Tool");
  });

  it("sorts free first", () => {
    const sorted = sortResources(sampleResources, "free-first", false);
    expect(sorted[0].costType).toBe("free");
    expect(sorted[1].costType).toBe("free");
    expect(sorted[2].costType).toBe("free");
    expect(sorted[3].costType).not.toBe("free");
  });

  it("returns copy when default or unrecognized sort option", () => {
    const sorted = sortResources(sampleResources, "unknown" as unknown as SortOption, false);
    expect(sorted).toEqual(sampleResources);
  });
});

describe("statusRank and demoteBroken (issue #76)", () => {
  it("ranks active < broken < expired", () => {
    expect(statusRank("active")).toBeLessThan(statusRank("broken"));
    expect(statusRank("broken")).toBeLessThan(statusRank("expired"));
  });

  it("groups broken after active and expired last, keeping relative order within each group", () => {
    const mixed: Resource[] = [
      { ...sampleResources[0], status: "broken" }, // tool-in
      { ...sampleResources[1], status: "expired" }, // tool-global
      { ...sampleResources[2], status: "active" }, // tool-design-global
      { ...sampleResources[3], status: "broken" }, // tool-ai-in
      { ...sampleResources[4], status: "active" }, // tool-us-only
    ];
    const demoted = demoteBroken(mixed);
    expect(demoted.map((r) => r.slug)).toEqual([
      "tool-design-global",
      "tool-us-only",
      "tool-in",
      "tool-ai-in",
      "tool-global",
    ]);
  });

  it("does not mutate the input array", () => {
    const mixed: Resource[] = [
      { ...sampleResources[0], status: "broken" },
      { ...sampleResources[1], status: "active" },
    ];
    demoteBroken(mixed);
    expect(mixed[0].status).toBe("broken");
  });
});

describe("sortResources demotes broken links in every sort mode (issue #76)", () => {
  const mixed: Resource[] = [
    { ...sampleResources[0], status: "broken" }, // Alpha Tool (broken)
    { ...sampleResources[3], status: "active" }, // Delta AI (active)
    { ...sampleResources[4], status: "expired" }, // Epsilon US (expired)
  ];

  const modes: SortOption[] = ["verified", "name-asc", "name-desc", "free-first"];

  it.each(modes)("sorts broken below active and expired last in '%s' mode", (mode) => {
    const sorted = sortResources(mixed, mode, false);
    expect(sorted.map((r) => r.status)).toEqual(["active", "broken", "expired"]);
  });

  it("sorts broken below active in search relevance order too", () => {
    const sorted = sortResources(mixed, "relevance", true);
    expect(sorted.map((r) => r.status)).toEqual(["active", "broken", "expired"]);
  });

  it("still orders alphabetically within each status group", () => {
    const mixedNames: Resource[] = [
      { ...sampleResources[0], status: "active", name: "Zeta" },
      { ...sampleResources[3], status: "active", name: "Alpha" },
      { ...sampleResources[4], status: "broken", name: "Beta" },
    ];
    const sorted = sortResources(mixedNames, "name-asc", false);
    expect(sorted.map((r) => r.name)).toEqual(["Alpha", "Zeta", "Beta"]);
  });
});

describe("self check block execution", () => {
  it("executes directory-filters self-check when executed directly", async () => {
    const originalArgv = process.argv[1];
    try {
      process.argv[1] = "src/lib/directory-filters.ts";
      vi.resetModules();
      const dynamicPath: string = "./directory-filters";
      await import(/* @vite-ignore */ dynamicPath);
    } finally {
      process.argv[1] = originalArgv;
    }
  });
});
