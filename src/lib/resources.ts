import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { MOCK_CATEGORIES, MOCK_RESOURCES } from "./mock-data";

const isDbAvailable = Boolean(process.env.POSTGRES_URL);

export type Resource = {
  id: number;
  slug: string;
  name: string;
  tagline: string | null;
  description: string;
  url: string | null;
  hasStaticClaimUrl: boolean;
  categoryId: number;
  categorySlug: string;
  categoryName: string;
  categoryIcon: string;
  tags: string[];
  region: "IN" | "Global";
  costType: "free" | "discount" | "stipend" | "scholarship" | "credits" | "trial";
  verificationNeeded: "none" | "edu_email" | "github_student_pack" | "student_id" | null;
  creditCardRequired: boolean | null;
  duration: "one_time" | "one_year" | "while_student" | "lifetime" | null;
  status: "active" | "expired" | "broken";
  lastVerifiedAt: number | null;
};

export type Category = {
  id: number;
  slug: string;
  name: string;
  icon: string;
};

const resources = schema.resources;
const categories = schema.categories;

const resourceColumns = {
  id: resources.id,
  slug: resources.slug,
  name: resources.name,
  tagline: resources.tagline,
  description: resources.description,
  url: resources.url,
  hasStaticClaimUrl: resources.hasStaticClaimUrl,
  categoryId: resources.categoryId,
  tags: resources.tags,
  region: resources.region,
  costType: resources.costType,
  verificationNeeded: resources.verificationNeeded,
  creditCardRequired: resources.creditCardRequired,
  duration: resources.duration,
  status: resources.status,
  lastVerifiedAt: resources.lastVerifiedAt,
  categorySlug: categories.slug,
  categoryName: categories.name,
  categoryIcon: categories.icon,
};

type ResourceRow = Omit<Resource, "lastVerifiedAt"> & { lastVerifiedAt: Date | null };

function toResource(row: ResourceRow): Resource {
  return { ...row, lastVerifiedAt: row.lastVerifiedAt ? row.lastVerifiedAt.getTime() : null };
}

// Public pages only ever see approved rows. Student submissions land with
// approved = false and stay invisible until an admin approves them.
// Directory is small enough (~600 rows) to load in full server-side and
// filter/search in memory — no need for a paginated query layer yet.
export async function getAllResources(): Promise<Resource[]> {
  if (!isDbAvailable) return MOCK_RESOURCES;
  try {
    const rows = await db
      .select(resourceColumns)
      .from(resources)
      .innerJoin(categories, eq(resources.categoryId, categories.id))
      .where(eq(resources.approved, true));
    return rows.map(toResource);
  } catch {
    return MOCK_RESOURCES;
  }
}

// Admin-only: finds a row whether or not it's approved, so a pending
// submission can be opened in the edit form before it goes live.
export async function getResourceById(id: number): Promise<Resource | null> {
  if (!isDbAvailable) return MOCK_RESOURCES.find((r) => r.id === id) ?? null;
  try {
    const [row] = await db
      .select(resourceColumns)
      .from(resources)
      .innerJoin(categories, eq(resources.categoryId, categories.id))
      .where(eq(resources.id, id))
      .limit(1);
    return row ? toResource(row) : null;
  } catch {
    return MOCK_RESOURCES.find((r) => r.id === id) ?? null;
  }
}

export async function getCategories(): Promise<Category[]> {
  if (!isDbAvailable) return MOCK_CATEGORIES;
  try {
    return await db
      .select({
        id: categories.id,
        slug: categories.slug,
        name: categories.name,
        icon: categories.icon,
      })
      .from(categories)
      .orderBy(categories.sortOrder);
  } catch {
    return MOCK_CATEGORIES;
  }
}

export function getAllTags(list: Resource[]): string[] {
  return [...new Set(list.flatMap((r) => r.tags))].sort();
}

export async function getCategoriesWithCounts(): Promise<(Category & { count: number })[]> {
  if (!isDbAvailable) {
    return MOCK_CATEGORIES.map((c) => ({
      ...c,
      count: MOCK_RESOURCES.filter((r) => r.categorySlug === c.slug).length,
    }));
  }
  try {
    const rows = await db
      .select({
        id: categories.id,
        slug: categories.slug,
        name: categories.name,
        icon: categories.icon,
        count: sql<number>`count(${resources.id})`,
      })
      .from(categories)
      .innerJoin(resources, and(eq(resources.categoryId, categories.id), eq(resources.approved, true)))
      .groupBy(categories.id)
      .orderBy(sql`count(${resources.id}) desc`);
    return rows.map((row) => ({ ...row, count: Number(row.count) }));
  } catch {
    return MOCK_CATEGORIES.map((c) => ({
      ...c,
      count: MOCK_RESOURCES.filter((r) => r.categorySlug === c.slug).length,
    }));
  }
}

export async function getResourceCount(): Promise<number> {
  if (!isDbAvailable) return MOCK_RESOURCES.length;
  try {
    const [row] = await db
      .select({ count: sql<number>`count(*)` })
      .from(resources)
      .where(eq(resources.approved, true));
    return Number(row.count);
  } catch {
    return MOCK_RESOURCES.length;
  }
}

// "Live" = approved and not flagged expired/broken by an admin or the
// link-health cron. lastCheckedAt is the most recent link-health run.
export async function getHomeStats(): Promise<{ live: number; total: number; lastCheckedAt: Date | null }> {
  if (!isDbAvailable) {
    return {
      live: MOCK_RESOURCES.length,
      total: MOCK_RESOURCES.length,
      lastCheckedAt: new Date(),
    };
  }
  try {
    const [row] = await db
      .select({
        live: sql<number>`count(*) filter (where ${resources.status} = 'active')`,
        total: sql<number>`count(*)`,
        lastCheckedAt: sql<string | null>`max(${resources.lastVerifiedAt})`,
      })
      .from(resources)
      .where(eq(resources.approved, true));
    return {
      live: Number(row.live),
      total: Number(row.total),
      lastCheckedAt: row.lastCheckedAt ? new Date(row.lastCheckedAt) : null,
    };
  } catch {
    return {
      live: MOCK_RESOURCES.length,
      total: MOCK_RESOURCES.length,
      lastCheckedAt: new Date(),
    };
  }
}

export type FeaturedResource = Pick<Resource, "slug" | "name" | "tagline" | "costType">;

// Returns rows in the order the slugs were given; slugs that don't match a
// live, approved row are skipped.
export async function getResourcesBySlugs(slugs: string[]): Promise<FeaturedResource[]> {
  if (slugs.length === 0) return [];
  if (!isDbAvailable) {
    return slugs
      .map((slug) => MOCK_RESOURCES.find((r) => r.slug === slug))
      .filter((r): r is Resource => Boolean(r))
      .map((r) => ({ slug: r.slug, name: r.name, tagline: r.tagline, costType: r.costType }));
  }
  try {
    const rows = await db
      .select({ slug: resources.slug, name: resources.name, tagline: resources.tagline, costType: resources.costType })
      .from(resources)
      .where(and(inArray(resources.slug, slugs), eq(resources.approved, true), eq(resources.status, "active")));
    return slugs.flatMap((slug) => rows.filter((row) => row.slug === slug));
  } catch {
    return slugs
      .map((slug) => MOCK_RESOURCES.find((r) => r.slug === slug))
      .filter((r): r is Resource => Boolean(r))
      .map((r) => ({ slug: r.slug, name: r.name, tagline: r.tagline, costType: r.costType }));
  }
}

export type PendingSubmission = {
  id: number;
  name: string;
  url: string | null;
  tagline: string | null;
  description: string;
  costType: Resource["costType"];
  region: Resource["region"];
  categoryName: string;
  submittedBy: string | null;
  createdAt: Date;
};

export async function getPendingSubmissions(): Promise<PendingSubmission[]> {
  return db
    .select({
      id: resources.id,
      name: resources.name,
      url: resources.url,
      tagline: resources.tagline,
      description: resources.description,
      costType: resources.costType,
      region: resources.region,
      categoryName: categories.name,
      submittedBy: resources.submittedBy,
      createdAt: resources.createdAt,
    })
    .from(resources)
    .innerJoin(categories, eq(resources.categoryId, categories.id))
    .where(eq(resources.approved, false))
    .orderBy(desc(resources.createdAt));
}

export type UserSubmission = {
  id: number;
  name: string;
  approved: boolean;
  status: Resource["status"];
  createdAt: Date;
};

export async function getSubmissionsByUser(userId: string): Promise<UserSubmission[]> {
  return db
    .select({
      id: resources.id,
      name: resources.name,
      approved: resources.approved,
      status: resources.status,
      createdAt: resources.createdAt,
    })
    .from(resources)
    .where(eq(resources.submittedBy, userId))
    .orderBy(desc(resources.createdAt))
    .limit(20);
}

export async function countPendingByUser(userId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(resources)
    .where(and(eq(resources.submittedBy, userId), eq(resources.approved, false)));
  return Number(row.count);
}

// Compares case-insensitively and ignores trailing slashes, so
// "https://figma.com/education/" and "https://Figma.com/education" match.
export async function isUrlListed(url: string): Promise<boolean> {
  const needle = url.toLowerCase().replace(/\/+$/, "");
  const [row] = await db
    .select({ id: resources.id })
    .from(resources)
    .where(sql`lower(rtrim(${resources.url}, '/')) = ${needle}`)
    .limit(1);
  return Boolean(row);
}
