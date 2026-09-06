// Reads offers.json (raw studentoffers.co export) and normalizes it into
// rows matching src/db/schema.ts. See PROGRESS.md §4.3 for the judgment
// calls encoded below (category_sub -> tag, cost_type mapping, missing
// claim_url handling, region collapsing).
import { readFileSync } from "node:fs";
import path from "node:path";

export type NormalizedCategory = {
  slug: string;
  name: string;
  icon: string;
  sortOrder: number;
};

export type NormalizedResource = {
  slug: string;
  name: string;
  tagline: string | null;
  description: string;
  url: string | null;
  hasStaticClaimUrl: boolean;
  categorySlug: string;
  tags: string[];
  region: "IN" | "Global";
  costType: "free" | "discount" | "stipend" | "scholarship" | "credits" | "trial";
  status: "active" | "expired" | "broken";
};

type RawOffer = {
  id: number;
  name: string;
  offer: string;
  description: string;
  claim_url: string | null;
  location: string | null;
  tag2: string | null;
  category_main: string;
  category_sub: string;
  slug: string;
  extra_info: string | null;
  tags: string[];
};

const CATEGORY_ICONS: Record<string, string> = {
  "AI & Machine Learning": "🤖",
  "Development Tools": "🛠️",
  "Design & Creative": "🎨",
  Productivity: "⚡",
  "Learning & Education": "📚",
  "Media & Entertainment": "🎬",
  "Shopping & Lifestyle": "🛍️",
  "Cloud & Hosting": "☁️",
  "Travel & Finance": "💳",
  "Security & Privacy": "🔒",
  "Science & Research": "🔬",
  "Food & Dining": "🍔",
  "Student Memberships": "🎓",
  "Health & Wellness": "🩺",
  "Marketing & Growth": "📈",
};

const COST_TYPE_MAP: Record<string, NormalizedResource["costType"]> = {
  Free: "free",
  Discount: "discount",
  Credit: "credits",
  Trial: "trial",
};

function slugifyCategory(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toRegion(location: string | null): "IN" | "Global" {
  return location === "India" ? "IN" : "Global";
}

function parseExtraInfo(raw: string | null): { notes: string[] } {
  if (!raw) return { notes: [] };
  try {
    const parsed = JSON.parse(raw) as {
      important_notes?: { text: string }[];
      disclaimer?: string;
    };
    const notes = (parsed.important_notes ?? []).map((n) => n.text);
    if (parsed.disclaimer) notes.push(parsed.disclaimer);
    return { notes };
  } catch {
    return { notes: [] };
  }
}

export function normalizeOffers(offersJsonPath: string): {
  categories: NormalizedCategory[];
  resources: NormalizedResource[];
} {
  const raw = JSON.parse(readFileSync(offersJsonPath, "utf-8")) as RawOffer[];

  const categoryNames = [...new Set(raw.map((o) => o.category_main))].sort();
  const categories: NormalizedCategory[] = categoryNames.map((name, i) => ({
    slug: slugifyCategory(name),
    name,
    icon: CATEGORY_ICONS[name] ?? "📦",
    sortOrder: i,
  }));

  const resources: NormalizedResource[] = raw.map((o) => {
    const { notes } = parseExtraInfo(o.extra_info);
    const description = notes.length
      ? `${o.description}\n\nNote: ${notes.join(" ")}`
      : o.description;

    const tags: string[] = [];
    const seen = new Set<string>();
    for (const t of [...o.tags, o.category_sub]) {
      if (!t) continue;
      const key = t.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      tags.push(t);
    }

    const hasStaticClaimUrl = Boolean(o.claim_url);

    return {
      slug: o.slug,
      name: o.name,
      tagline: o.offer || null,
      description,
      url: hasStaticClaimUrl ? o.claim_url : null,
      hasStaticClaimUrl,
      categorySlug: slugifyCategory(o.category_main),
      tags,
      region: toRegion(o.location),
      costType: o.tag2 ? (COST_TYPE_MAP[o.tag2] ?? "free") : "free",
      status: "active",
    };
  });

  return { categories, resources };
}

if (process.argv[1] && process.argv[1].endsWith("normalize-data.ts")) {
  const offersPath = path.join(process.cwd(), "offers.json");
  const { categories, resources } = normalizeOffers(offersPath);

  console.assert(categories.length > 0, "expected at least one category");
  console.assert(resources.length === 593, `expected 593 resources, got ${resources.length}`);

  const categorySlugs = new Set(categories.map((c) => c.slug));
  for (const r of resources) {
    console.assert(
      categorySlugs.has(r.categorySlug),
      `resource ${r.slug} references unknown category ${r.categorySlug}`,
    );
    console.assert(
      r.hasStaticClaimUrl === (r.url !== null),
      `resource ${r.slug} has inconsistent hasStaticClaimUrl/url`,
    );
  }

  const noClaimUrl = resources.filter((r) => !r.hasStaticClaimUrl).length;
  console.log(
    `OK: ${categories.length} categories, ${resources.length} resources, ${noClaimUrl} without a static claim URL`,
  );
}
