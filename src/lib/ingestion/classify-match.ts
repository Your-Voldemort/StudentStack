import Fuse from "fuse.js";
import type { Resource } from "@/lib/resources";
import type { CandidateFields } from "./types";

export type MatchResult =
  | { kind: "duplicate" }
  | { kind: "possible_duplicate"; matchedResourceId: number }
  | { kind: "new" };

// Fuse.js threshold, lower = stricter match required. Starting point per
// the design doc's open question — revisit once a real source produces
// real candidates to tune against.
const FUZZY_THRESHOLD = 0.3;

export function classifyMatch(candidate: CandidateFields, existingResources: Resource[]): MatchResult {
  if (candidate.url) {
    const exact = existingResources.find((r) => r.url === candidate.url);
    if (exact) return { kind: "duplicate" };
  }

  const fuse = new Fuse(existingResources, { keys: ["name"], threshold: FUZZY_THRESHOLD });
  const hit = fuse.search(candidate.name)[0];
  if (hit) return { kind: "possible_duplicate", matchedResourceId: hit.item.id };

  return { kind: "new" };
}

if (process.argv[1] && process.argv[1].endsWith("classify-match.ts")) {
  const existing: Resource[] = [
    {
      id: 1,
      slug: "gh-copilot",
      name: "GitHub Copilot",
      tagline: null,
      description: "",
      url: "https://github.com/copilot",
      hasStaticClaimUrl: true,
      categoryId: 1,
      categorySlug: "dev",
      categoryName: "Dev",
      categoryIcon: "🛠️",
      tags: [],
      region: "Global",
      costType: "free",
      verificationNeeded: null,
      creditCardRequired: null,
      duration: null,
      status: "active",
      lastVerifiedAt: null,
    },
  ];

  console.assert(
    classifyMatch({ name: "GitHub Copilot", description: "", url: "https://github.com/copilot" }, existing).kind ===
      "duplicate",
    "exact URL match should be a duplicate",
  );
  console.assert(
    classifyMatch(
      { name: "Github Co-pilot", description: "", url: "https://different.example.com" },
      existing,
    ).kind === "possible_duplicate",
    "a close name match with a different URL should be a possible duplicate",
  );
  console.assert(
    classifyMatch(
      { name: "Totally Unrelated Tool", description: "", url: "https://unrelated.example.com" },
      existing,
    ).kind === "new",
    "an unrelated name/URL should be classified as new",
  );

  console.log("OK: classify-match.ts self-check passed");
}
