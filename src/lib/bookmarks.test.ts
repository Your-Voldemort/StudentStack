import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeDb } from "@/test/fake-db";
import {
  deleteBookmark,
  getBookmarkStatuses,
  getGotItCount,
  getGotItCounts,
  getSavedResources,
  isApprovedResource,
  upsertBookmark,
} from "./bookmarks";
import { isBookmarkStatus } from "./bookmark-status";

vi.mock("@/db", async () => {
  const { fakeDb } = await import("@/test/fake-db");
  return { db: fakeDb.db, schema: await import("@/db/schema") };
});

beforeEach(() => {
  fakeDb.reset();
  vi.stubEnv("POSTGRES_URL", "postgres://test");
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("bookmark-status.ts", () => {
  it("validates allowed bookmark statuses", () => {
    expect(isBookmarkStatus("interested")).toBe(true);
    expect(isBookmarkStatus("applied")).toBe(true);
    expect(isBookmarkStatus("got_it")).toBe(true);
    expect(isBookmarkStatus("rejected")).toBe(true);
    expect(isBookmarkStatus("archived")).toBe(false);
    expect(isBookmarkStatus(null)).toBe(false);
    expect(isBookmarkStatus(42)).toBe(false);
  });
});

describe("bookmark reads", () => {
  it("indexes a user's statuses by resource id", async () => {
    fakeDb.queue([
      { resourceId: 3, status: "applied" },
      { resourceId: 9, status: "got_it" },
    ]);
    expect(await getBookmarkStatuses("user-1")).toEqual({ 3: "applied", 9: "got_it" });
  });

  it("returns saved resources newest first", async () => {
    const saved = [{ resourceId: 3, slug: "figma", status: "interested" }];
    fakeDb.queue(saved);
    expect(await getSavedResources("user-1")).toEqual(saved);
    expect(fakeDb.methods(0)).toEqual(["select", "from", "innerJoin", "where", "orderBy"]);
  });

  it("checks whether a resource is approved", async () => {
    fakeDb.queue([{ id: 3 }], []);
    expect(await isApprovedResource(3)).toBe(true);
    expect(await isApprovedResource(4)).toBe(false);
  });
});

describe("bookmark writes", () => {
  it("upserts on the (user, resource) pair, updating only the status", async () => {
    await upsertBookmark("user-1", 3, "applied");
    expect(fakeDb.call(0, "values")?.args).toEqual([{ userId: "user-1", resourceId: 3, status: "applied" }]);
    const conflict = fakeDb.call(0, "onConflictDoUpdate")?.args[0] as { target: unknown[]; set: unknown };
    expect(conflict.target).toHaveLength(2);
    expect(conflict.set).toEqual({ status: "applied" });
  });

  it("deletes with a where clause", async () => {
    await deleteBookmark("user-1", 3);
    expect(fakeDb.methods(0)).toEqual(["delete", "where"]);
  });
});

describe("got-it counts", () => {
  it("are empty without a database", async () => {
    vi.stubEnv("POSTGRES_URL", "");
    expect(await getGotItCounts()).toEqual({});
    expect(await getGotItCount(3)).toBe(0);
    expect(fakeDb.queries).toHaveLength(0);
  });

  it("convert aggregate counts to numbers", async () => {
    fakeDb.queue(
      [
        { resourceId: 3, count: "4" },
        { resourceId: 5, count: "1" },
      ],
      [{ count: "4" }],
      [],
    );
    expect(await getGotItCounts()).toEqual({ 3: 4, 5: 1 });
    expect(await getGotItCount(3)).toBe(4);
    expect(await getGotItCount(6)).toBe(0);
  });

  it("degrade to empty values when the query fails", async () => {
    fakeDb.queue(new Error("timeout"), new Error("timeout"));
    expect(await getGotItCounts()).toEqual({});
    expect(await getGotItCount(3)).toBe(0);
    expect(console.warn).toHaveBeenCalledWith("[bookmarks] got-it counts failed:", "timeout");
  });
});
