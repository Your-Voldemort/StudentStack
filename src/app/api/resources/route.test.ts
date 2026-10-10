import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";
import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  getResourcesPaginated,
  type PaginatedResources,
} from "@/lib/resources";

// The DB-backed module is mocked so this test never touches resources.ts
// (or its database import) — it covers the route's own param validation
// and response shaping only.
vi.mock("@/lib/resources", () => ({
  DEFAULT_PAGE_SIZE: 30,
  MAX_PAGE_SIZE: 100,
  getResourcesPaginated: vi.fn(),
}));

const mockGet = vi.mocked(getResourcesPaginated);

const canned: PaginatedResources = {
  resources: [
    {
      id: 6,
      slug: "sample",
      name: "Sample",
      tagline: null,
      description: "Sample resource",
      url: "https://example.com",
      hasStaticClaimUrl: false,
      categoryId: 1,
      categorySlug: "development-tools",
      categoryName: "Development Tools",
      categoryIcon: "dev",
      tags: [],
      region: "Global",
      costType: "free",
      verificationNeeded: "none",
      creditCardRequired: false,
      duration: "lifetime",
      deadline: null,
      status: "active",
      lastVerifiedAt: null,
    },
  ],
  total: 12,
  page: 2,
  limit: 5,
  totalPages: 3,
};

function get(url: string) {
  return GET(new Request(`http://localhost${url}`));
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGet.mockResolvedValue(canned);
});

describe("GET /api/resources", () => {
  it("passes default page and limit through and returns the paginated result", async () => {
    const res = await get("/api/resources");
    expect(res.status).toBe(200);
    expect(mockGet).toHaveBeenCalledWith(1, DEFAULT_PAGE_SIZE);
    expect(await res.json()).toEqual(canned);
  });

  it("honors page and limit params", async () => {
    const res = await get("/api/resources?page=2&limit=5");
    expect(res.status).toBe(200);
    expect(mockGet).toHaveBeenCalledWith(2, 5);
    expect(await res.json()).toEqual(canned);
  });

  it("rejects non-integer or out-of-range page params", async () => {
    for (const page of ["abc", "0", "-2", "1.5", ""]) {
      const res = await get(`/api/resources?page=${page}`);
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({
        error: "Invalid 'page' query parameter: expected a positive integer",
      });
    }
    expect(mockGet).not.toHaveBeenCalled();
  });

  it("rejects non-integer or out-of-range limit params", async () => {
    for (const limit of ["abc", "0", "-5", "2.5"]) {
      const res = await get(`/api/resources?limit=${limit}`);
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({
        error: "Invalid 'limit' query parameter: expected a positive integer",
      });
    }
    expect(mockGet).not.toHaveBeenCalled();
  });

  it("clamps an oversized limit to MAX_PAGE_SIZE", async () => {
    const res = await get(`/api/resources?limit=${MAX_PAGE_SIZE + 500}`);
    expect(res.status).toBe(200);
    expect(mockGet).toHaveBeenCalledWith(1, MAX_PAGE_SIZE);
  });
});
