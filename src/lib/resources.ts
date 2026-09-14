import { eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";

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

// Directory is small enough (~600 rows) to load in full server-side and
// filter/search in memory — no need for a paginated query layer yet.
export async function getAllResources(): Promise<Resource[]> {
  const rows = await db
    .select({
      id: schema.resources.id,
      slug: schema.resources.slug,
      name: schema.resources.name,
      tagline: schema.resources.tagline,
      description: schema.resources.description,
      url: schema.resources.url,
      hasStaticClaimUrl: schema.resources.hasStaticClaimUrl,
      categoryId: schema.resources.categoryId,
      tags: schema.resources.tags,
      region: schema.resources.region,
      costType: schema.resources.costType,
      verificationNeeded: schema.resources.verificationNeeded,
      creditCardRequired: schema.resources.creditCardRequired,
      duration: schema.resources.duration,
      status: schema.resources.status,
      lastVerifiedAt: schema.resources.lastVerifiedAt,
      categorySlug: schema.categories.slug,
      categoryName: schema.categories.name,
      categoryIcon: schema.categories.icon,
    })
    .from(schema.resources)
    .innerJoin(schema.categories, eq(schema.resources.categoryId, schema.categories.id));
  return rows.map((r) => ({
    ...r,
    lastVerifiedAt: r.lastVerifiedAt ? r.lastVerifiedAt.getTime() : null,
  }));
}

export async function getCategories(): Promise<Category[]> {
  return db
    .select({
      id: schema.categories.id,
      slug: schema.categories.slug,
      name: schema.categories.name,
      icon: schema.categories.icon,
    })
    .from(schema.categories)
    .orderBy(schema.categories.sortOrder);
}

export function getAllTags(resources: Resource[]): string[] {
  return [...new Set(resources.flatMap((r) => r.tags))].sort();
}

export async function getCategoriesWithCounts(): Promise<(Category & { count: number })[]> {
  return db
    .select({
      id: schema.categories.id,
      slug: schema.categories.slug,
      name: schema.categories.name,
      icon: schema.categories.icon,
      count: sql<number>`count(${schema.resources.id})`,
    })
    .from(schema.categories)
    .innerJoin(schema.resources, eq(schema.resources.categoryId, schema.categories.id))
    .groupBy(schema.categories.id)
    .orderBy(sql`count(${schema.resources.id}) desc`);
}

export async function getResourceCount(): Promise<number> {
  const [row] = await db.select({ count: sql<number>`count(*)` }).from(schema.resources);
  return row.count;
}
