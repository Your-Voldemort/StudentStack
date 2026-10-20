import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";
import { getResourceBySlug, type Resource } from "@/lib/resources";

// The DB-backed module is mocked so this test never touches resources.ts
// (or its database import) — it covers the route's own slug resolution,
// 404 handling, and cache headers only.
vi.mock("@/lib/resources", () => ({
  getResourceBySlug: vi.fn(),
}));

const mockGet = vi.mocked(getResourceBySlug);

const canned: Resource = {
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
  regions: [],
  regionLocked: false,
  costType: "free",
  verificationNeeded: "none",
  creditCardRequired: false,
  duration: "lifetime",
  deadline: null,
  status: "active",
  lastVerifiedAt: null,
};

function get(slug: string) {
  return GET(new Request(`http://localhost/api/resources/${slug}`), {
    params: Promise.resolve({ slug }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/resources/[slug]", () => {
  it("returns the resource for a known slug with cache headers", async () => {
    mockGet.mockResolvedValue(canned);

    const res = await get("sample");

    expect(res.status).toBe(200);
    expect(mockGet).toHaveBeenCalledWith("sample");
    expect(await res.json()).toEqual(canned);
    expect(res.headers.get("Cache-Control")).toBe(
      "public, s-maxage=60, stale-while-revalidate=300",
    );
  });

  it("answers 404 for an unknown slug", async () => {
    mockGet.mockResolvedValue(null);

    const res = await get("nope");

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Resource not found: 'nope'" });
    expect(res.headers.get("Cache-Control")).toBe(
      "public, s-maxage=60, stale-while-revalidate=300",
    );
  });
});
