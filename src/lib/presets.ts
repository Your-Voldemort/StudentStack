import type { DirectoryFilters } from "./directory-filters";

export type Preset = {
  slug: string;
  label: string;
  title: string;
  description: string;
  filters: Partial<DirectoryFilters>;
};

// Category slugs below come from scripts/normalize-data.ts's slugifyCategory()
// applied to offers.json's category_main values — verify against a live
// `pnpm db:seed` run if offers.json's category names ever change.
export const PRESETS: Preset[] = [
  {
    slug: "free-for-indian-students",
    label: "Free for Indian students",
    title: "Free tools and offers for Indian students",
    description: "Free software, credits, and discounts confirmed to work in India.",
    filters: { costType: ["free"], region: "IN" },
  },
  {
    slug: "github-student-pack",
    label: "GitHub Student Pack",
    title: "GitHub Student Developer Pack resources",
    description: "Resources that mention the GitHub Student Developer Pack.",
    // No resource carries a literal "GitHub Student Pack" tag in this
    // dataset — it only shows up in description text (e.g. "Requires
    // GitHub Student Developer Pack"). Full-text search over description
    // is the only filter dimension that actually surfaces these.
    filters: { search: "GitHub Student Pack" },
  },
  {
    slug: "no-edu-needed",
    label: "No .edu needed",
    title: "Student resources with no .edu email required",
    description: "Free tools and discounts you can claim without a university email address.",
    filters: { verificationNeeded: ["none"] },
  },
  {
    slug: "ai-tools",
    label: "AI tools",
    title: "Free and discounted AI tools for students",
    description: "AI and machine learning tools, credits, and trials for students.",
    filters: { category: ["ai-and-machine-learning"] },
  },
  {
    slug: "cloud-credits",
    label: "Cloud credits",
    title: "Student cloud credits",
    description: "Cloud hosting credits and discounts available to students.",
    filters: { category: ["cloud-and-hosting"] },
  },
  {
    slug: "design-tools",
    label: "Design",
    title: "Free and discounted design tools for students",
    description: "Design and creative software offers for students.",
    filters: { category: ["design-and-creative"] },
  },
];

export function getPreset(slug: string): Preset | undefined {
  return PRESETS.find((p) => p.slug === slug);
}

export function fullFilters(partial: Partial<DirectoryFilters>): DirectoryFilters {
  return {
    search: "",
    category: [],
    region: "all",
    costType: [],
    tags: [],
    verificationNeeded: [],
    creditCardRequired: [],
    duration: [],
    ...partial,
  };
}
