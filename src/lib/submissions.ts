import type { Resource } from "@/lib/resources";

export const SUBMISSION_COST_TYPES = ["free", "discount", "credits", "trial", "scholarship", "stipend"] as const;

export type SubmissionField = "name" | "url" | "tagline" | "description" | "categoryId" | "costType" | "region";
export type SubmissionErrors = Partial<Record<SubmissionField, string>>;

export type SubmissionValue = {
  name: string;
  url: string;
  tagline: string | null;
  description: string;
  categoryId: number;
  costType: Resource["costType"];
  region: Resource["region"];
};

const LIMITS = { name: 80, url: 500, tagline: 90, descriptionMin: 20, description: 600 };

// Only http(s) links with a real hostname. Drops the #fragment and a bare
// trailing "/" so the duplicate check sees one spelling per link.
export function normalizeUrl(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (!url.hostname.includes(".")) return null;
  url.hash = "";
  const text = url.toString();
  return url.pathname === "/" && !url.search ? text.replace(/\/$/, "") : text;
}

export function validateSubmission(
  input: Record<string, string | undefined>,
  categoryIds: number[],
): { ok: true; value: SubmissionValue } | { ok: false; errors: SubmissionErrors } {
  const errors: SubmissionErrors = {};

  const name = (input.name ?? "").trim();
  if (name.length < 2) errors.name = "Add the offer’s name.";
  else if (name.length > LIMITS.name) errors.name = `Keep the name under ${LIMITS.name} characters.`;

  const rawUrl = (input.url ?? "").trim();
  const url = rawUrl.length <= LIMITS.url ? normalizeUrl(rawUrl) : null;
  if (!url) errors.url = "Paste the full link to the offer, starting with https://";

  const tagline = (input.tagline ?? "").trim();
  if (tagline.length > LIMITS.tagline) errors.tagline = `Keep the one-liner under ${LIMITS.tagline} characters.`;

  const description = (input.description ?? "").trim();
  if (description.length < LIMITS.descriptionMin) {
    errors.description = "Say what students get and how to claim it (at least 20 characters).";
  } else if (description.length > LIMITS.description) {
    errors.description = `Keep it under ${LIMITS.description} characters.`;
  }

  const categoryId = Number(input.categoryId);
  if (!Number.isInteger(categoryId) || !categoryIds.includes(categoryId)) errors.categoryId = "Pick a category.";

  const costType = input.costType ?? "";
  const isCostType = (SUBMISSION_COST_TYPES as readonly string[]).includes(costType);
  if (!isCostType) errors.costType = "Pick what kind of offer it is.";

  const region: Resource["region"] = input.region === "IN" ? "IN" : "Global";

  if (Object.keys(errors).length > 0 || !url || !isCostType) return { ok: false, errors };
  return {
    ok: true,
    value: {
      name,
      url,
      tagline: tagline || null,
      description,
      categoryId,
      costType: costType as Resource["costType"],
      region,
    },
  };
}

export function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/, "");
  return slug || "offer";
}

if (process.argv[1] && process.argv[1].endsWith("submissions.ts")) {
  let failures = 0;
  const check = (condition: boolean, message: string) => {
    if (!condition) {
      failures++;
      console.error("FAIL:", message);
    }
  };
  const cats = [1, 2];
  const good = {
    name: " Figma ",
    url: "https://www.figma.com/education/#pricing",
    tagline: "Free Pro plan",
    description: "Free Figma Professional for verified students.",
    categoryId: "2",
    costType: "free",
    region: "Global",
  };

  const ok = validateSubmission(good, cats);
  check(ok.ok, "a complete submission should pass");
  if (ok.ok) {
    check(ok.value.name === "Figma", "name should be trimmed");
    check(ok.value.url === "https://www.figma.com/education/", `url should drop the fragment, got ${ok.value.url}`);
    check(ok.value.categoryId === 2 && ok.value.region === "Global", "categoryId should parse and region default to Global");
  }

  const fieldError = (patch: Record<string, string>, field: SubmissionField) => {
    const result = validateSubmission({ ...good, ...patch }, cats);
    return !result.ok && Boolean(result.errors[field]);
  };
  check(fieldError({ url: "javascript:alert(1)" }, "url"), "javascript: links must be rejected");
  check(fieldError({ url: "ftp://files.example.com" }, "url"), "non-http links must be rejected");
  check(fieldError({ url: "https://localhost/offer" }, "url"), "hostnames without a dot must be rejected");
  check(fieldError({ categoryId: "9" }, "categoryId"), "unknown categories must be rejected");
  check(fieldError({ costType: "expired" }, "costType"), "unknown cost types must be rejected");
  check(fieldError({ description: "too short" }, "description"), "short descriptions must be rejected");
  check(fieldError({ name: "x".repeat(81) }, "name"), "names over 80 characters must be rejected");
  check(fieldError({ tagline: "x".repeat(91) }, "tagline"), "taglines over 90 characters must be rejected");

  const india = validateSubmission({ ...good, region: "IN", tagline: "" }, cats);
  check(india.ok && india.value.region === "IN" && india.value.tagline === null, "IN region kept, empty tagline stored as null");

  check(normalizeUrl("https://Example.com/") === "https://example.com", "bare trailing slash should be dropped");
  check(slugify("AI & ML Tools!") === "ai-and-ml-tools", "slugify should spell out & and strip punctuation");
  check(slugify("!!!") === "offer", "slugify should fall back when nothing is left");

  if (failures === 0) console.log("OK: submissions.ts self-check passed");
  else process.exitCode = 1;
}
