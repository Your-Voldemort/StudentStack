import { describe, it, expect, vi } from "vitest";
import Fuse from "fuse.js";
import {
  applyFilters,
  countByCategory,
  countByCostType,
  countByRegion,
  topTags,
  sortResources,
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
    costType: "free",
    verificationNeeded: null,
    creditCardRequired: null,
    duration: "lifetime",
    status: "active",
    lastVerifiedAt: null,
    deadline: null,
  },
];

const defaultFilters: DirectoryFilters = {
  search: "",
  category: [],
  region: "all",
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
    expect(results).toHaveLength(4);
  });

  it("filters to only India resources when region is 'IN'", () => {
    const results = applyFilters(sampleResources, { ...defaultFilters, region: "IN" }, fuse);
    expect(results).toHaveLength(2);
    expect(results.every((r) => r.region === "IN")).toBe(true);
    expect(results.map((r) => r.slug)).toEqual(["tool-in", "tool-ai-in"]);
  });

  it("filters to only Global resources when region is 'Global'", () => {
    const results = applyFilters(sampleResources, { ...defaultFilters, region: "Global" }, fuse);
    expect(results).toHaveLength(2);
    expect(results.every((r) => r.region === "Global")).toBe(true);
    expect(results.map((r) => r.slug)).toEqual(["tool-global", "tool-design-global"]);
  });

  it("skips region filtering when skip is 'region'", () => {
    const results = applyFilters(
      sampleResources,
      { ...defaultFilters, region: "IN", costType: ["free"] },
      fuse,
      "region",
    );
    expect(results).toHaveLength(2);
    expect(results.every((r) => r.costType === "free")).toBe(true);
  });
});

describe("countByRegion", () => {
  it("counts IN, Global, and total counts accurately for mixed resources", () => {
    const counts = countByRegion(sampleResources);
    expect(counts).toEqual({
      in: 2,
      global: 2,
      all: 4,
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

  it("handles only Global resources", () => {
    const globalOnly = sampleResources.filter((r) => r.region === "Global");
    const counts = countByRegion(globalOnly);
    expect(counts).toEqual({
      in: 0,
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
    expect(counts["cloud-and-hosting"]).toBe(1);
  });

  it("counts by costType correctly", () => {
    const counts = countByCostType(sampleResources);
    expect(counts["free"]).toBe(2);
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
    expect(sorted[2].costType).not.toBe("free");
  });

  it("returns copy when default or unrecognized sort option", () => {
    const sorted = sortResources(sampleResources, "unknown" as unknown as SortOption, false);
    expect(sorted).toEqual(sampleResources);
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
