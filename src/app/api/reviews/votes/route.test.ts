import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const getUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: async () => ({ auth: { getUser } }),
}));
vi.mock("@/lib/reviews", () => ({ getViewerReviewState: vi.fn() }));

import { getViewerReviewState } from "@/lib/reviews";
import { GET } from "./route";

const get = (query: string) => GET(new NextRequest(`http://localhost/api/reviews/votes${query}`));

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("GET /api/reviews/votes", () => {
  it("requires a valid resourceId", async () => {
    expect((await get("")).status).toBe(400);
    expect((await get("?resourceId=abc")).status).toBe(400);
  });

  it("returns an empty signed-out state without Supabase or a session", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    expect(await (await get("?resourceId=3")).json()).toEqual({ signedIn: false, voted: [], mine: null });
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    getUser.mockResolvedValue({ data: { user: null } });
    expect(await (await get("?resourceId=3")).json()).toEqual({ signedIn: false, voted: [], mine: null });
  });

  it("returns the session user's votes and own review, uncached", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    vi.mocked(getViewerReviewState).mockResolvedValue({ voted: [4, 5], mine: 6 });
    const res = await get("?resourceId=3");
    expect(getViewerReviewState).toHaveBeenCalledWith("u1", 3);
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
    expect(await res.json()).toEqual({ signedIn: true, voted: [4, 5], mine: 6 });
  });

  it("degrades to no votes when the query fails", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.mocked(getViewerReviewState).mockRejectedValue(new Error("down"));
    expect(await (await get("?resourceId=3")).json()).toEqual({ signedIn: true, voted: [], mine: null });
  });
});
