import { describe, expect, it } from "vitest";
import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  normalizePagination,
  paginate,
} from "./pagination";

const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

describe("normalizePagination", () => {
  it("passes valid page and limit through", () => {
    expect(normalizePagination(2, 5)).toEqual({ page: 2, limit: 5 });
  });

  it("normalizes invalid pages to 1", () => {
    for (const page of [0, -3, 1.5, Number.NaN, "2", null, undefined]) {
      expect(normalizePagination(page, 5).page).toBe(1);
    }
  });

  it("normalizes invalid limits to the default page size", () => {
    for (const limit of [0, -10, 2.5, Number.NaN, "5", null, undefined]) {
      expect(normalizePagination(1, limit).limit).toBe(DEFAULT_PAGE_SIZE);
    }
  });

  it("clamps oversized limits to MAX_PAGE_SIZE", () => {
    expect(normalizePagination(1, MAX_PAGE_SIZE + 500).limit).toBe(MAX_PAGE_SIZE);
    expect(normalizePagination(1, MAX_PAGE_SIZE).limit).toBe(MAX_PAGE_SIZE);
  });
});

describe("paginate", () => {
  it("returns ordered, non-overlapping pages", () => {
    const page1 = paginate(items, 1, 5);
    const page2 = paginate(items, 2, 5);
    const page3 = paginate(items, 3, 5);

    expect(page1).toMatchObject({ items: [1, 2, 3, 4, 5], total: 12, page: 1, limit: 5, totalPages: 3 });
    expect(page2.items).toEqual([6, 7, 8, 9, 10]);
    expect(page3.items).toEqual([11, 12]);
    expect(new Set([...page1.items, ...page2.items, ...page3.items]).size).toBe(12);
  });

  it("returns an empty page past the last page", () => {
    const result = paginate(items, 99, 5);
    expect(result.items).toEqual([]);
    expect(result).toMatchObject({ total: 12, page: 99, limit: 5, totalPages: 3 });
  });

  it("defaults to page 1 with the default page size", () => {
    const result = paginate(items, undefined, undefined);
    expect(result).toMatchObject({ page: 1, limit: DEFAULT_PAGE_SIZE, total: 12, totalPages: 1 });
    expect(result.items).toEqual(items);
  });

  it("reports a single page for an empty list", () => {
    const result = paginate([], 1, 10);
    expect(result).toMatchObject({ items: [], total: 0, totalPages: 1 });
  });

  it("echoes the normalized page and limit back", () => {
    const result = paginate(items, 0, 500);
    expect(result).toMatchObject({ page: 1, limit: MAX_PAGE_SIZE });
  });
});
