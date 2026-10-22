import { describe, it, expect, vi, beforeEach } from "vitest";

const getUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: async () => ({ auth: { getUser } }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/bookmarks", () => ({ isApprovedResource: vi.fn() }));
vi.mock("@/lib/reviews", () => ({
  addHelpfulVote: vi.fn(),
  removeHelpfulVote: vi.fn(),
  getReviewForVote: vi.fn(),
  deleteReview: vi.fn(),
  getUserReview: vi.fn(),
  hasBookmarked: vi.fn(),
  upsertReview: vi.fn(),
}));

import { isApprovedResource } from "@/lib/bookmarks";
import { addHelpfulVote, getReviewForVote, removeHelpfulVote } from "@/lib/reviews";
import { validateHelpfulVote } from "@/lib/review-rules";
import { setHelpfulVote } from "./actions";

const ME = "00000000-0000-0000-0000-000000000001";
const AUTHOR = "00000000-0000-0000-0000-000000000002";

function signIn(id: string | null) {
  getUser.mockResolvedValue({ data: { user: id ? { id, email: "a@b.com" } : null } });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(isApprovedResource).mockResolvedValue(true);
  vi.mocked(getReviewForVote).mockResolvedValue({ userId: AUTHOR, resourceId: 3 });
});

describe("validateHelpfulVote", () => {
  it("accepts a positive integer id and a boolean", () => {
    expect(validateHelpfulVote(5, true)).toEqual({ ok: true, value: { reviewId: 5, helpful: true } });
    expect(validateHelpfulVote(5, false)).toEqual({ ok: true, value: { reviewId: 5, helpful: false } });
  });

  it.each([0, -1, 1.5, "5", null, undefined, NaN])("rejects review id %s", (id) =>
    expect(validateHelpfulVote(id, true).ok).toBe(false),
  );

  it.each(["true", 1, null, undefined])("rejects helpful flag %s", (flag) =>
    expect(validateHelpfulVote(5, flag).ok).toBe(false),
  );
});

describe("setHelpfulVote", () => {
  it("requires a session", async () => {
    signIn(null);
    expect(await setHelpfulVote(9, true)).toEqual({ ok: false, error: "Sign in to mark reviews as helpful." });
    expect(getReviewForVote).not.toHaveBeenCalled();
  });

  it("rejects invalid arguments before touching the database", async () => {
    signIn(ME);
    expect((await setHelpfulVote("9" as unknown as number, true)).ok).toBe(false);
    expect(getReviewForVote).not.toHaveBeenCalled();
  });

  it("rejects a vote on the student's own review", async () => {
    signIn(AUTHOR);
    expect(await setHelpfulVote(9, true)).toEqual({ ok: false, error: "You can’t vote on your own review." });
    expect(addHelpfulVote).not.toHaveBeenCalled();
  });

  it("rejects missing reviews and reviews on unpublished offers", async () => {
    signIn(ME);
    vi.mocked(getReviewForVote).mockResolvedValueOnce(null);
    expect((await setHelpfulVote(9, true)).ok).toBe(false);
    vi.mocked(isApprovedResource).mockResolvedValueOnce(false);
    expect((await setHelpfulVote(9, true)).ok).toBe(false);
    expect(addHelpfulVote).not.toHaveBeenCalled();
  });

  it("adds and removes the vote as the session user", async () => {
    signIn(ME);
    expect(await setHelpfulVote(9, true)).toEqual({ ok: true });
    expect(addHelpfulVote).toHaveBeenCalledWith(ME, 9);
    expect(await setHelpfulVote(9, false)).toEqual({ ok: true });
    expect(removeHelpfulVote).toHaveBeenCalledWith(ME, 9);
  });

  it("reports database failures", async () => {
    signIn(ME);
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.mocked(addHelpfulVote).mockRejectedValueOnce(new Error("down"));
    expect(await setHelpfulVote(9, true)).toEqual({ ok: false, error: "We couldn’t save your vote. Try again." });
  });
});
