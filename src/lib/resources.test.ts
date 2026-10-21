import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeDb } from "@/test/fake-db";
import { MOCK_CATEGORIES, MOCK_RESOURCES } from "./mock-data";
import {
  countPendingByUser,
  getAllResourceSlugs,
  getAllResources,
  getAllTags,
  getBookmarkedDeadlines,
  getCategories,
  getCategoriesWithCounts,
  getHomeStats,
  getLiveCostTypeCounts,
  getPendingSubmissions,
  getPendingSubmissionsCount,
  getPopularThisWeek,
  getResourceById,
  getResourceBySlug,
  getResourceCount,
  getResourcesByIds,
  getResourcesBySlugs,
  getResourcesForSlugs,
  getResourcesPaginated,
  getResourcesWithDeadlines,
  getSubmissionsByUser,
  isUrlListed,
  type Resource,
} from "./resources";

// Postgres is replaced by the in-memory fake: tests cover the mock-data
// fallbacks (no POSTGRES_URL), the row mapping when a database answers, and
// the fall-back-to-mock path when a query throws.
vi.mock("@/db", async () => {
  const { fakeDb } = await import("@/test/fake-db");
  return { db: fakeDb.db, schema: await import("@/db/schema") };
});

const verified = new Date("2026-09-01T00:00:00Z");
const deadline = new Date("2026-12-01T00:00:00Z");

// A row as the DB returns it: timestamps are Dates, not epoch ms.
function row(over: Record<string, unknown> = {}) {
  return { ...MOCK_RESOURCES[0], lastVerifiedAt: verified, deadline, opensAt: null, ...over };
}

function withDatabase() {
  vi.stubEnv("POSTGRES_URL", "postgres://test");
}

beforeEach(() => {
  fakeDb.reset();
  vi.stubEnv("POSTGRES_URL", "");
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("without a database", () => {
  it("serves mock resources, categories, and counts", async () => {
    expect(await getAllResources()).toBe(MOCK_RESOURCES);
    expect(await getCategories()).toBe(MOCK_CATEGORIES);
    expect(await getResourceCount()).toBe(MOCK_RESOURCES.length);
    const withCounts = await getCategoriesWithCounts();
    const dev = withCounts.find((c) => c.slug === "development-tools");
    expect(dev?.count).toBe(MOCK_RESOURCES.filter((r) => r.categorySlug === "development-tools").length);
    expect(fakeDb.queries).toHaveLength(0);
  });

  it("looks up mock rows by slug, id, and id list", async () => {
    expect((await getResourceBySlug("figma"))?.id).toBe(3);
    expect(await getResourceBySlug("nope")).toBeNull();
    expect((await getResourceById(2))?.slug).toBe("jetbrains");
    expect(await getResourceById(99_999)).toBeNull();
    const byIds = await getResourcesByIds([1, 1, 3, -4, 2.5]);
    expect(byIds.map((r) => r.id).sort()).toEqual([1, 3]);
    expect(await getResourcesByIds([0, -1])).toEqual([]);
    expect((await getResourcesForSlugs(["figma", "jetbrains"])).map((r) => r.slug).sort()).toEqual(["figma", "jetbrains"]);
    expect(await getResourcesForSlugs([])).toEqual([]);
  });

  it("returns featured rows in the requested slug order, skipping unknown slugs", async () => {
    const rows = await getResourcesBySlugs(["figma", "missing", "github-copilot"]);
    expect(rows.map((r) => r.slug)).toEqual(["figma", "github-copilot"]);
    expect(Object.keys(rows[0]).sort()).toEqual(["costType", "name", "slug", "tagline"]);
    expect(await getResourcesBySlugs([])).toEqual([]);
  });

  it("lists mock deadlines soonest first", async () => {
    const rows = await getResourcesWithDeadlines();
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.deadline !== null)).toBe(true);
    const times = rows.map((r) => r.deadline as number);
    expect(times).toEqual([...times].sort((a, b) => a - b));
  });

  it("paginates mock rows by id and applies API filters", async () => {
    const page = await getResourcesPaginated(1, 5);
    expect(page.resources.map((r) => r.id)).toEqual([1, 2, 3, 4, 5]);
    expect(page).toMatchObject({ page: 1, limit: 5, total: MOCK_RESOURCES.length });
    expect(page.totalPages).toBe(Math.ceil(MOCK_RESOURCES.length / 5));

    const filtered = await getResourcesPaginated(1, 100, { category: "design-and-creative" });
    expect(filtered.resources.length).toBeGreaterThan(0);
    expect(filtered.resources.every((r) => r.categorySlug === "design-and-creative")).toBe(true);

    const empty = await getResourcesPaginated(1, 10, { category: "no-such-category" });
    expect(empty).toMatchObject({ resources: [], total: 0, totalPages: 1 });
  });

  it("returns honest empty values for data that only exists in a database", async () => {
    expect(await getBookmarkedDeadlines("user-1")).toEqual([]);
    expect(await getPopularThisWeek()).toEqual([]);
    expect(await getPendingSubmissions()).toEqual([]);
    expect(await getPendingSubmissionsCount()).toBe(0);
  });

  it("counts live cost types and home stats from mock rows", async () => {
    const counts = await getLiveCostTypeCounts();
    const active = MOCK_RESOURCES.filter((r) => r.status === "active");
    expect(Object.values(counts).reduce((a, b) => a + b, 0)).toBe(active.length);
    const stats = await getHomeStats();
    expect(stats).toMatchObject({ live: MOCK_RESOURCES.length, total: MOCK_RESOURCES.length });
    expect(stats.lastCheckedAt).toBeInstanceOf(Date);
  });

  it("builds sitemap entries from mock rows", async () => {
    const slugs = await getAllResourceSlugs();
    expect(slugs).toHaveLength(MOCK_RESOURCES.length);
    expect(slugs[0]).toEqual({ slug: MOCK_RESOURCES[0].slug, updatedAt: expect.any(Date) });
  });
});

describe("getAllTags", () => {
  it("returns each tag once, sorted", () => {
    const list = [{ tags: ["Web", "AI"] }, { tags: ["AI", "Design"] }, { tags: [] }] as unknown as Resource[];
    expect(getAllTags(list)).toEqual(["AI", "Design", "Web"]);
  });
});

describe("with a database", () => {
  beforeEach(withDatabase);

  it("maps DB timestamps to epoch ms", async () => {
    fakeDb.queue([row(), row({ id: 2, lastVerifiedAt: null, deadline: null, opensAt: deadline })]);
    const [first, second] = await getAllResources();
    expect(first).toMatchObject({ lastVerifiedAt: verified.getTime(), deadline: deadline.getTime(), opensAt: null });
    expect(second).toMatchObject({ lastVerifiedAt: null, deadline: null, opensAt: deadline.getTime() });
    expect(fakeDb.methods(0)).toEqual(["select", "from", "innerJoin", "where"]);
  });

  it("paginates with a count query and an offset", async () => {
    fakeDb.queue([{ count: "42" }], [row()]);
    const page = await getResourcesPaginated(3, 10, {
      kind: ["scholarship"],
      category: "learning-and-education",
      region: "IN",
      deadlineBefore: new Date("2027-01-01"),
    });
    expect(page).toMatchObject({ total: 42, page: 3, limit: 10, totalPages: 5 });
    expect(page.resources).toHaveLength(1);
    expect(fakeDb.call(1, "limit")?.args).toEqual([10]);
    expect(fakeDb.call(1, "offset")?.args).toEqual([20]);
  });

  it("treats a missing count row as zero and accepts the Global region filter", async () => {
    fakeDb.queue([], []);
    const page = await getResourcesPaginated(1, 10, { region: "Global" });
    expect(page).toMatchObject({ resources: [], total: 0, totalPages: 1 });
  });

  it("returns single rows or null for slug and id lookups", async () => {
    fakeDb.queue([row({ slug: "db-row" })], [], [row({ id: 77 })], []);
    expect((await getResourceBySlug("db-row"))?.slug).toBe("db-row");
    expect(await getResourceBySlug("missing")).toBeNull();
    expect((await getResourceById(77))?.id).toBe(77);
    expect(await getResourceById(78)).toBeNull();
  });

  it("maps list queries", async () => {
    fakeDb.queue([row()], [row()], [row()], [row()]);
    expect(await getResourcesWithDeadlines()).toHaveLength(1);
    expect(await getResourcesForSlugs(["github-copilot"])).toHaveLength(1);
    expect(await getResourcesByIds([1])).toHaveLength(1);
    expect(await getBookmarkedDeadlines("user-1")).toHaveLength(1);
  });

  it("returns categories, sitemap rows, and numeric counts", async () => {
    const updatedAt = new Date();
    fakeDb.queue(
      [MOCK_CATEGORIES[0]],
      [{ ...MOCK_CATEGORIES[0], count: "7" }],
      [{ count: "12" }],
      [],
      [{ slug: "a", updatedAt }],
      [{ count: "3" }],
      [],
    );
    expect(await getCategories()).toEqual([MOCK_CATEGORIES[0]]);
    expect(await getCategoriesWithCounts()).toEqual([{ ...MOCK_CATEGORIES[0], count: 7 }]);
    expect(await getResourceCount()).toBe(12);
    expect(await getResourceCount()).toBe(0);
    expect(await getAllResourceSlugs()).toEqual([{ slug: "a", updatedAt }]);
    expect(await getPendingSubmissionsCount()).toBe(3);
    expect(await getPendingSubmissionsCount()).toBe(0);
  });

  it("parses home stats, with and without a link-health run", async () => {
    fakeDb.queue(
      [{ live: "8", total: "10", lastCheckedAt: "2026-10-01T00:00:00Z" }],
      [{ live: "0", total: "0", lastCheckedAt: null }],
    );
    expect(await getHomeStats()).toEqual({ live: 8, total: 10, lastCheckedAt: new Date("2026-10-01T00:00:00Z") });
    expect(await getHomeStats()).toEqual({ live: 0, total: 0, lastCheckedAt: null });
  });

  it("keeps featured rows in slug order", async () => {
    fakeDb.queue([
      { slug: "b", name: "B", tagline: null, costType: "free" },
      { slug: "a", name: "A", tagline: null, costType: "free" },
    ]);
    const rows = await getResourcesBySlugs(["a", "missing", "b"]);
    expect(rows.map((r) => r.slug)).toEqual(["a", "b"]);
  });

  it("converts weekly click counts and cost-type counts to numbers", async () => {
    fakeDb.queue(
      [{ slug: "a", name: "A", tagline: null, costType: "free", weeklyClicks: "9" }],
      [
        { costType: "free", count: "5" },
        { costType: "discount", count: "2" },
      ],
    );
    expect(await getPopularThisWeek(3)).toEqual([{ slug: "a", name: "A", tagline: null, costType: "free", weeklyClicks: 9 }]);
    expect(fakeDb.call(0, "limit")?.args).toEqual([3]);
    expect(await getLiveCostTypeCounts()).toEqual({ free: 5, discount: 2 });
  });

  it("passes pending submissions and per-user submissions through", async () => {
    const pending = [{ id: 1, name: "New perk", createdAt: new Date() }];
    const mine = [{ id: 2, name: "Mine", approved: false, status: "active", createdAt: new Date() }];
    fakeDb.queue(pending, mine, [{ count: "4" }], []);
    expect(await getPendingSubmissions()).toEqual(pending);
    expect(await getSubmissionsByUser("user-1")).toEqual(mine);
    expect(fakeDb.call(1, "limit")?.args).toEqual([20]);
    expect(await countPendingByUser("user-1")).toBe(4);
    expect(await countPendingByUser("user-1")).toBe(0);
  });

  it("reports whether a URL is already listed", async () => {
    fakeDb.queue([{ id: 1 }], []);
    expect(await isUrlListed("https://www.Figma.com/education/")).toBe(true);
    expect(await isUrlListed("https://unlisted.example")).toBe(false);
  });

  it("falls back to mock data or empty values when a query fails", async () => {
    // One failure per query below; getResourcesPaginated runs two.
    fakeDb.queue(...Array.from({ length: 19 }, () => new Error("connection refused")));

    expect(await getAllResources()).toBe(MOCK_RESOURCES);
    expect((await getResourcesPaginated(1, 5)).resources.map((r) => r.id)).toEqual([1, 2, 3, 4, 5]);
    expect((await getResourcesWithDeadlines()).length).toBeGreaterThan(0);
    expect((await getResourceBySlug("figma"))?.id).toBe(3);
    expect((await getResourcesForSlugs(["figma"])).map((r) => r.slug)).toEqual(["figma"]);
    expect(await getBookmarkedDeadlines("user-1")).toEqual([]);
    expect(await getAllResourceSlugs()).toHaveLength(MOCK_RESOURCES.length);
    expect((await getResourceById(1))?.slug).toBe("github-copilot");
    expect((await getResourcesByIds([1])).map((r) => r.id)).toEqual([1]);
    expect(await getCategories()).toBe(MOCK_CATEGORIES);
    expect(await getCategoriesWithCounts()).toHaveLength(MOCK_CATEGORIES.length);
    expect(await getResourceCount()).toBe(MOCK_RESOURCES.length);
    expect((await getHomeStats()).total).toBe(MOCK_RESOURCES.length);
    expect((await getResourcesBySlugs(["figma"])).map((r) => r.slug)).toEqual(["figma"]);
    expect(await getPopularThisWeek()).toEqual([]);
    expect(await getLiveCostTypeCounts()).toEqual({});
    expect(await getPendingSubmissions()).toEqual([]);
    expect(await getPendingSubmissionsCount()).toBe(0);
    expect(console.warn).toHaveBeenCalledWith(
      "[StudentStack DB] getAllResources query failed:",
      "connection refused",
    );
  });
});
