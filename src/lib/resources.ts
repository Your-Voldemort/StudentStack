import { and, desc, eq, gte, inArray, isNotNull, lte, sql, type SQL } from "drizzle-orm";
import { db, schema } from "@/db";
import { MOCK_CATEGORIES, MOCK_RESOURCES } from "./mock-data";
import { normalizePagination, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "./pagination";
import type { ResourceEligibility } from "@/db/schema";
import { urlMatchKey } from "./submissions";
import { matchesApiFilters, type ApiFilters } from "./api-filters";

export { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE };
export type { ResourceEligibility };

function hasDatabase(): boolean {
  return Boolean(process.env.POSTGRES_URL);
}

// Phase 1 opportunity kinds (issue #81). Most directory entries are plain
// perks; scholarships, fellowships, internships, mentorships, and programs
// get their own filter chips and SEO preset pages.
export type ResourceKind =
  | "perk"
  | "scholarship"
  | "fellowship"
  | "internship"
  | "mentorship"
  | "program";

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
  // Phase 1 opportunities (issue #81): what kind of opportunity a resource
  // is. Optional — resources that predate the field (and rows from a DB
  // without the column) are treated as plain "perk" offers.
  kind?: ResourceKind;
  // Preserved region availability (issue #74): normalized region codes
  // (e.g. ["IN"], ["US"], [] when unrestricted) plus whether the offer is
  // restricted to specific geographies. "Works in India" is
  // IN ∈ regions || !regionLocked — see worksInIndia() in
  // src/lib/directory-filters.ts.
  regions: string[];
  regionLocked: boolean;
  costType: "free" | "discount" | "stipend" | "scholarship" | "credits" | "trial";
  verificationNeeded: "none" | "edu_email" | "github_student_pack" | "student_id" | null;
  creditCardRequired: boolean | null;
  duration: "one_time" | "one_year" | "while_student" | "lifetime" | null;
  deadline: number | null;
  // Phase 1 deadline display fields (issue #80). Optional — most rows
  // predate them. `amount` is the prize/value line ("$5,000", "Full tuition"),
  // `provider` the organization behind the offer, and `recurrence` the cycle
  // label shown on past items ("Feb" → "Opens again ~Feb").
  amount?: string | null;
  provider?: string | null;
  recurrence?: string | null;
  // Opportunity schema (issue #78): when the application window opens
  // (epoch ms) and structured eligibility. Unset eligibility fields mean
  // the opportunity is open on that axis.
  opensAt?: number | null;
  eligibility?: ResourceEligibility | null;
  // Review aggregate (issue #37), merged in by pages that show ratings.
  rating?: { average: number; count: number } | null;
  // Community signals (issue #82): how many students marked this "Got it"
  // (merged in by pages that show it) and the submitter's optional credit.
  gotItCount?: number;
  contributorCredit?: string | null;
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
  kind: resources.kind,
  regions: resources.regions,
  regionLocked: resources.regionLocked,
  costType: resources.costType,
  verificationNeeded: resources.verificationNeeded,
  creditCardRequired: resources.creditCardRequired,
  duration: resources.duration,
  deadline: resources.deadline,
  opensAt: resources.opensAt,
  recurrence: resources.recurrence,
  amount: resources.amount,
  provider: resources.provider,
  eligibility: resources.eligibility,
  contributorCredit: resources.contributorCredit,
  status: resources.status,
  lastVerifiedAt: resources.lastVerifiedAt,
  categorySlug: categories.slug,
  categoryName: categories.name,
  categoryIcon: categories.icon,
};

type ResourceRow = Omit<Resource, "lastVerifiedAt" | "deadline" | "opensAt"> & {
  lastVerifiedAt: Date | null;
  deadline: Date | null;
  opensAt: Date | null;
};

function toResource(row: ResourceRow): Resource {
  return {
    ...row,
    lastVerifiedAt: row.lastVerifiedAt ? row.lastVerifiedAt.getTime() : null,
    deadline: row.deadline ? row.deadline.getTime() : null,
    opensAt: row.opensAt ? row.opensAt.getTime() : null,
  };
}

// Public pages only ever see approved rows. Student submissions land with
// approved = false and stay invisible until an admin approves them.
// The directory page loads everything server-side and filters/searches in
// memory (fine at ~600 rows); the paginated layer below exists for
// server-side consumers that can't afford the full table (see #28).
export async function getAllResources(): Promise<Resource[]> {
  if (!hasDatabase()) return MOCK_RESOURCES;
  try {
    const rows = await db
      .select(resourceColumns)
      .from(resources)
      .innerJoin(categories, eq(resources.categoryId, categories.id))
      .where(eq(resources.approved, true));
    return rows.map(toResource);
  } catch (error) {
    console.warn("[StudentStack DB] getAllResources query failed:", error instanceof Error ? error.message : error);
    return MOCK_RESOURCES;
  }
}

// Server-side pagination, offset-based (Option A from #28: simpler than
// cursor pagination, and fine at the current dataset size). Rows are
// ordered by id ascending so pages are stable across requests. Only
// approved rows are visible. Falls back to mock data when no database is
// configured, mirroring getAllResources.
export type PaginatedResources = {
  resources: Resource[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

// SQL twin of matchesApiFilters() in src/lib/api-filters.ts (issue #82).
function apiFilterConditions(f: ApiFilters, now: Date): SQL[] {
  const conditions: SQL[] = [];
  if (f.kind?.length) conditions.push(inArray(resources.kind, f.kind));
  if (f.category) conditions.push(eq(categories.slug, f.category));
  if (f.region === "IN") {
    conditions.push(
      sql`(${resources.region} = 'IN' or 'IN' = any(${resources.regions}) or not ${resources.regionLocked})`,
    );
  }
  if (f.region === "Global") conditions.push(eq(resources.regionLocked, false));
  if (f.deadlineBefore) {
    conditions.push(
      eq(resources.status, "active"),
      isNotNull(resources.deadline),
      gte(resources.deadline, now),
      lte(resources.deadline, f.deadlineBefore),
    );
  }
  return conditions;
}

export async function getResourcesPaginated(
  page: number = 1,
  limit: number = DEFAULT_PAGE_SIZE,
  filters: ApiFilters = {},
): Promise<PaginatedResources> {
  const { page: safePage, limit: safeLimit } = normalizePagination(page, limit);
  const offset = (safePage - 1) * safeLimit;

  const finish = (items: Resource[], total: number): PaginatedResources => ({
    resources: items,
    total,
    page: safePage,
    limit: safeLimit,
    totalPages: Math.max(1, Math.ceil(total / safeLimit)),
  });

  const now = new Date();
  const mockResult = () => {
    const sorted = MOCK_RESOURCES.filter((r) => matchesApiFilters(r, filters, now.getTime())).sort(
      (a, b) => a.id - b.id,
    );
    return finish(sorted.slice(offset, offset + safeLimit), sorted.length);
  };

  if (!hasDatabase()) return mockResult();
  try {
    const where = and(eq(resources.approved, true), ...apiFilterConditions(filters, now));
    const [countRow, rows] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)` })
        .from(resources)
        .innerJoin(categories, eq(resources.categoryId, categories.id))
        .where(where),
      db
        .select(resourceColumns)
        .from(resources)
        .innerJoin(categories, eq(resources.categoryId, categories.id))
        .where(where)
        .orderBy(resources.id)
        .limit(safeLimit)
        .offset(offset),
    ]);
    const total = Number(countRow[0]?.count ?? 0);
    return finish(
      rows.map(toResource),
      total,
    );
  } catch (error) {
    console.warn("[StudentStack DB] getResourcesPaginated query failed:", error instanceof Error ? error.message : error);
    return mockResult();
  }
}

// /deadlines: every approved resource carrying a deadline, soonest first.
// The page partitions these into closing-soon / upcoming / past sections.
export async function getResourcesWithDeadlines(): Promise<Resource[]> {
  const mockFallback = () =>
    MOCK_RESOURCES.filter((r) => r.deadline !== null).sort(
      (a, b) => (a.deadline as number) - (b.deadline as number),
    );
  if (!hasDatabase()) return mockFallback();
  try {
    const rows = await db
      .select(resourceColumns)
      .from(resources)
      .innerJoin(categories, eq(resources.categoryId, categories.id))
      .where(and(eq(resources.approved, true), isNotNull(resources.deadline)))
      .orderBy(resources.deadline);
    return rows.map(toResource);
  } catch (error) {
    console.warn("[StudentStack DB] getResourcesWithDeadlines query failed:", error instanceof Error ? error.message : error);
    return mockFallback();
  }
}

// Per-resource SEO pages (/r/[slug]): a single resource by slug, approved
// rows only — unknown or unapproved slugs resolve to null so the page can
// answer 404. Falls back to mock data when no database is configured,
// mirroring getAllResources.
export async function getResourceBySlug(slug: string): Promise<Resource | null> {
  if (!hasDatabase()) return MOCK_RESOURCES.find((r) => r.slug === slug) ?? null;
  try {
    const [row] = await db
      .select(resourceColumns)
      .from(resources)
      .innerJoin(categories, eq(resources.categoryId, categories.id))
      .where(and(eq(resources.slug, slug), eq(resources.approved, true)))
      .limit(1);
    return row ? toResource(row) : null;
  } catch (error) {
    console.warn("[StudentStack DB] getResourceBySlug query failed:", error instanceof Error ? error.message : error);
    return MOCK_RESOURCES.find((r) => r.slug === slug) ?? null;
  }
}

// /compare/[set]: full rows for the given slugs, approved only. Order is
// left to the caller (see orderForSet in src/lib/comparisons.ts).
export async function getResourcesForSlugs(slugs: string[]): Promise<Resource[]> {
  if (slugs.length === 0) return [];
  const mockFallback = () => MOCK_RESOURCES.filter((r) => slugs.includes(r.slug));
  if (!hasDatabase()) return mockFallback();
  try {
    const rows = await db
      .select(resourceColumns)
      .from(resources)
      .innerJoin(categories, eq(resources.categoryId, categories.id))
      .where(and(inArray(resources.slug, slugs), eq(resources.approved, true)));
    return rows.map(toResource);
  } catch (error) {
    console.warn("[StudentStack DB] getResourcesForSlugs query failed:", error instanceof Error ? error.message : error);
    return mockFallback();
  }
}

// Per-user deadlines feed (issue #84): the student's bookmarked, approved
// resources that carry a deadline.
export async function getBookmarkedDeadlines(userId: string): Promise<Resource[]> {
  if (!hasDatabase()) return [];
  try {
    const bookmarks = schema.bookmarks;
    const rows = await db
      .select(resourceColumns)
      .from(bookmarks)
      .innerJoin(resources, eq(bookmarks.resourceId, resources.id))
      .innerJoin(categories, eq(resources.categoryId, categories.id))
      .where(and(eq(bookmarks.userId, userId), eq(resources.approved, true), isNotNull(resources.deadline)))
      .orderBy(resources.deadline);
    return rows.map(toResource);
  } catch (error) {
    console.warn("[StudentStack DB] getBookmarkedDeadlines query failed:", error instanceof Error ? error.message : error);
    return [];
  }
}

// Sitemap: every approved resource slug plus its last update, so
// /sitemap.xml can list all per-resource pages with fresh lastModified dates.
export async function getAllResourceSlugs(): Promise<{ slug: string; updatedAt: Date }[]> {
  const mockFallback = () =>
    MOCK_RESOURCES.map((r) => ({
      slug: r.slug,
      updatedAt: new Date(r.lastVerifiedAt ?? Date.now()),
    }));
  if (!hasDatabase()) return mockFallback();
  try {
    return await db
      .select({ slug: resources.slug, updatedAt: resources.updatedAt })
      .from(resources)
      .where(eq(resources.approved, true));
  } catch (error) {
    console.warn("[StudentStack DB] getAllResourceSlugs query failed:", error instanceof Error ? error.message : error);
    return mockFallback();
  }
}

// Admin-only: finds a row whether or not it's approved, so a pending
// submission can be opened in the edit form before it goes live.
export async function getResourceById(id: number): Promise<Resource | null> {
  if (!hasDatabase()) return MOCK_RESOURCES.find((r) => r.id === id) ?? null;
  try {
    const [row] = await db
      .select(resourceColumns)
      .from(resources)
      .innerJoin(categories, eq(resources.categoryId, categories.id))
      .where(eq(resources.id, id))
      .limit(1);
    return row ? toResource(row) : null;
  } catch (error) {
    console.warn("[StudentStack DB] getResourceById query failed:", error instanceof Error ? error.message : error);
    return MOCK_RESOURCES.find((r) => r.id === id) ?? null;
  }
}

// Admin-only: fetches only the requested resource IDs (e.g. matched duplicate
// resources on /admin/ingestion) instead of loading the entire table.
export async function getResourcesByIds(ids: number[]): Promise<Resource[]> {
  const uniqueIds = [...new Set(ids.filter((id) => Number.isInteger(id) && id > 0))];
  if (uniqueIds.length === 0) return [];
  if (!hasDatabase()) {
    return MOCK_RESOURCES.filter((r) => uniqueIds.includes(r.id));
  }
  try {
    const rows = await db
      .select(resourceColumns)
      .from(resources)
      .innerJoin(categories, eq(resources.categoryId, categories.id))
      .where(inArray(resources.id, uniqueIds));
    return rows.map(toResource);
  } catch (error) {
    console.warn("[StudentStack DB] getResourcesByIds query failed:", error instanceof Error ? error.message : error);
    return MOCK_RESOURCES.filter((r) => uniqueIds.includes(r.id));
  }
}

export async function getCategories(): Promise<Category[]> {
  if (!hasDatabase()) return MOCK_CATEGORIES;
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
  } catch (error) {
    console.warn("[StudentStack DB] getCategories query failed:", error instanceof Error ? error.message : error);
    return MOCK_CATEGORIES;
  }
}

export function getAllTags(list: Resource[]): string[] {
  return [...new Set(list.flatMap((r) => r.tags))].sort();
}

export async function getCategoriesWithCounts(): Promise<(Category & { count: number })[]> {
  if (!hasDatabase()) {
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
  } catch (error) {
    console.warn("[StudentStack DB] getCategoriesWithCounts query failed:", error instanceof Error ? error.message : error);
    return MOCK_CATEGORIES.map((c) => ({
      ...c,
      count: MOCK_RESOURCES.filter((r) => r.categorySlug === c.slug).length,
    }));
  }
}

export async function getResourceCount(): Promise<number> {
  if (!hasDatabase()) return MOCK_RESOURCES.length;
  try {
    const [row] = await db
      .select({ count: sql<number>`count(*)` })
      .from(resources)
      .where(eq(resources.approved, true));
    return Number(row?.count ?? 0);
  } catch (error) {
    console.warn("[StudentStack DB] getResourceCount query failed:", error instanceof Error ? error.message : error);
    return MOCK_RESOURCES.length;
  }
}

// "Live" = approved and not flagged expired/broken by an admin or the
// link-health cron. lastCheckedAt is the most recent link-health run.
export async function getHomeStats(): Promise<{ live: number; total: number; lastCheckedAt: Date | null }> {
  if (!hasDatabase()) {
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
      live: Number(row?.live ?? 0),
      total: Number(row?.total ?? 0),
      lastCheckedAt: row?.lastCheckedAt ? new Date(row.lastCheckedAt) : null,
    };
  } catch (error) {
    console.warn("[StudentStack DB] getHomeStats query failed:", error instanceof Error ? error.message : error);
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
  if (!hasDatabase()) {
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
  } catch (error) {
    console.warn("[StudentStack DB] getResourcesBySlugs query failed:", error instanceof Error ? error.message : error);
    return slugs
      .map((slug) => MOCK_RESOURCES.find((r) => r.slug === slug))
      .filter((r): r is Resource => Boolean(r))
      .map((r) => ({ slug: r.slug, name: r.name, tagline: r.tagline, costType: r.costType }));
  }
}

export type PopularResource = Pick<Resource, "slug" | "name" | "tagline" | "costType"> & {
  weeklyClicks: number;
};

// "Popular this week" (issue #77): top clicked live resources over the last
// 7 days, aggregated from click_events (written by POST
// /api/resources/[id]/click, see #26). Only approved + active rows count.
// Returns [] when no database is configured or when nothing was clicked in
// the last 7 days — the homepage falls back to the curated FEATURED_SLUGS
// ("The Real Numbers Rule": never show popularity backed by no data).
export async function getPopularThisWeek(limit: number = 5): Promise<PopularResource[]> {
  if (!hasDatabase()) return [];
  try {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const clickEvents = schema.clickEvents;
    const rows = await db
      .select({
        slug: resources.slug,
        name: resources.name,
        tagline: resources.tagline,
        costType: resources.costType,
        weeklyClicks: sql<number>`count(${clickEvents.id})`,
      })
      .from(clickEvents)
      .innerJoin(resources, eq(clickEvents.resourceId, resources.id))
      .where(
        and(
          sql`${clickEvents.createdAt} >= ${weekAgo}`,
          eq(resources.approved, true),
          eq(resources.status, "active"),
        ),
      )
      .groupBy(resources.id, resources.slug, resources.name, resources.tagline, resources.costType)
      .orderBy(sql`count(${clickEvents.id}) desc`)
      .limit(limit);
    return rows.map((row) => ({ ...row, weeklyClicks: Number(row.weeklyClicks) }));
  } catch (error) {
    console.warn("[StudentStack DB] getPopularThisWeek query failed:", error instanceof Error ? error.message : error);
    return [];
  }
}

// Live per-cost-type counts (approved + active only). Powers honest hero
// copy (issue #77): the homepage only names cost types that actually have
// live rows, so it never promises scholarships/stipends before Phase 1
// data lands.
export async function getLiveCostTypeCounts(): Promise<Record<string, number>> {
  const empty: Record<string, number> = {};
  if (!hasDatabase()) {
    for (const r of MOCK_RESOURCES) {
      if (r.status === "active") empty[r.costType] = (empty[r.costType] ?? 0) + 1;
    }
    return empty;
  }
  try {
    const rows = await db
      .select({ costType: resources.costType, count: sql<number>`count(*)` })
      .from(resources)
      .where(and(eq(resources.approved, true), eq(resources.status, "active")))
      .groupBy(resources.costType);
    const counts: Record<string, number> = {};
    for (const row of rows) counts[row.costType] = Number(row.count);
    return counts;
  } catch (error) {
    console.warn("[StudentStack DB] getLiveCostTypeCounts query failed:", error instanceof Error ? error.message : error);
    return empty;
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
  if (!hasDatabase()) return [];
  try {
    return await db
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
  } catch (error) {
    console.warn("[StudentStack DB] getPendingSubmissions query failed:", error instanceof Error ? error.message : error);
    return [];
  }
}

export async function getPendingSubmissionsCount(): Promise<number> {
  if (!hasDatabase()) return 0;
  try {
    const [row] = await db
      .select({ count: sql<number>`count(*)` })
      .from(resources)
      .where(eq(resources.approved, false));
    return Number(row?.count ?? 0);
  } catch {
    return 0;
  }
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
  return Number(row?.count ?? 0);
}

// Matches on urlMatchKey(): ignores case, protocol, a leading "www.", the
// #fragment, and trailing slashes, so "http://www.Figma.com/education/" and
// "https://figma.com/education" are the same offer. The SQL below mirrors
// urlMatchKey() in src/lib/submissions.ts.
export async function isUrlListed(url: string): Promise<boolean> {
  const needle = urlMatchKey(url);
  const [row] = await db
    .select({ id: resources.id })
    .from(resources)
    .where(
      sql`rtrim(regexp_replace(regexp_replace(lower(${resources.url}), '^https?://(www\\.)?', ''), '#.*$', ''), '/') = ${needle}`,
    )
    .limit(1);
  return Boolean(row);
}
