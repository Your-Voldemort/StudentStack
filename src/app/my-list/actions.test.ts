import { beforeEach, describe, expect, it, vi } from "vitest";
import { revalidatePath } from "next/cache";
import { deleteBookmark, isApprovedResource, upsertBookmark } from "@/lib/bookmarks";
import { getOrCreateCalendarToken, rotateCalendarToken, setEmailDigest } from "@/lib/profiles";
import {
  enableCalendarFeed,
  removeBookmark,
  resetCalendarFeed,
  saveBookmark,
  setDigestPreference,
} from "./actions";

// Server Functions can be called directly with any arguments, so these
// cover the session check and argument validation in front of the DB
// helpers (which are mocked).
const getUser = vi.fn();
const createServerSupabaseClient = vi.fn(async () => ({ auth: { getUser } }));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: () => createServerSupabaseClient(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/bookmarks", () => ({
  deleteBookmark: vi.fn(),
  isApprovedResource: vi.fn(),
  upsertBookmark: vi.fn(),
}));
vi.mock("@/lib/profiles", () => ({
  getOrCreateCalendarToken: vi.fn(),
  rotateCalendarToken: vi.fn(),
  setEmailDigest: vi.fn(),
}));

function signedIn(id = "user-1") {
  getUser.mockResolvedValue({ data: { user: { id } } });
}

function signedOut() {
  getUser.mockResolvedValue({ data: { user: null } });
}

beforeEach(() => {
  vi.clearAllMocks();
  createServerSupabaseClient.mockImplementation(async () => ({ auth: { getUser } }));
  vi.mocked(isApprovedResource).mockResolvedValue(true);
  vi.spyOn(console, "warn").mockImplementation(() => {});
  signedIn();
});

describe("saveBookmark", () => {
  it("requires a session", async () => {
    signedOut();
    expect(await saveBookmark(3)).toEqual({ ok: false, reason: "signed_out" });
    expect(upsertBookmark).not.toHaveBeenCalled();
  });

  it.each([0, -1, 2.5, Number.NaN, "3" as unknown as number])("rejects resource id %s", async (id) => {
    expect(await saveBookmark(id)).toEqual({ ok: false, reason: "invalid" });
    expect(upsertBookmark).not.toHaveBeenCalled();
  });

  it("rejects an unknown status", async () => {
    expect(await saveBookmark(3, "hired" as never)).toEqual({ ok: false, reason: "invalid" });
  });

  it("rejects a resource that isn't approved", async () => {
    vi.mocked(isApprovedResource).mockResolvedValue(false);
    expect(await saveBookmark(3)).toEqual({ ok: false, reason: "invalid" });
    expect(upsertBookmark).not.toHaveBeenCalled();
  });

  it("saves as interested by default, for the session's user", async () => {
    signedIn("user-9");
    expect(await saveBookmark(3)).toEqual({ ok: true });
    expect(upsertBookmark).toHaveBeenCalledWith("user-9", 3, "interested");
    expect(revalidatePath).toHaveBeenCalledWith("/my-list");
  });

  it("saves an explicit status", async () => {
    await saveBookmark(3, "got_it");
    expect(upsertBookmark).toHaveBeenCalledWith("user-1", 3, "got_it");
  });

  it("reports a failed write without revalidating", async () => {
    vi.mocked(upsertBookmark).mockRejectedValueOnce(new Error("db down"));
    expect(await saveBookmark(3)).toEqual({ ok: false, reason: "failed" });
    expect(revalidatePath).not.toHaveBeenCalled();

    createServerSupabaseClient.mockRejectedValueOnce(new Error("supabase unreachable"));
    expect(await saveBookmark(3)).toEqual({ ok: false, reason: "failed" });
  });
});

describe("removeBookmark", () => {
  it("requires a session and a valid id", async () => {
    signedOut();
    expect(await removeBookmark(3)).toEqual({ ok: false, reason: "signed_out" });
    signedIn();
    expect(await removeBookmark(-3)).toEqual({ ok: false, reason: "invalid" });
    expect(deleteBookmark).not.toHaveBeenCalled();
  });

  it("deletes the session user's bookmark", async () => {
    expect(await removeBookmark(3)).toEqual({ ok: true });
    expect(deleteBookmark).toHaveBeenCalledWith("user-1", 3);
    expect(revalidatePath).toHaveBeenCalledWith("/my-list");
  });

  it("reports a failed delete", async () => {
    vi.mocked(deleteBookmark).mockRejectedValueOnce("boom");
    expect(await removeBookmark(3)).toEqual({ ok: false, reason: "failed" });
    expect(console.warn).toHaveBeenCalledWith("[bookmarks] remove failed:", "boom");

    createServerSupabaseClient.mockRejectedValueOnce(new Error("auth failed"));
    expect(await removeBookmark(3)).toEqual({ ok: false, reason: "failed" });
  });
});

describe("calendar feed and digest form actions", () => {
  it("do nothing when signed out", async () => {
    signedOut();
    await enableCalendarFeed();
    await resetCalendarFeed();
    await setDigestPreference(new FormData());
    expect(getOrCreateCalendarToken).not.toHaveBeenCalled();
    expect(rotateCalendarToken).not.toHaveBeenCalled();
    expect(setEmailDigest).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("create and rotate the session user's calendar token", async () => {
    await enableCalendarFeed();
    expect(getOrCreateCalendarToken).toHaveBeenCalledWith("user-1");
    await resetCalendarFeed();
    expect(rotateCalendarToken).toHaveBeenCalledWith("user-1");
    expect(revalidatePath).toHaveBeenCalledTimes(2);
  });

  it("only turns the digest on for enabled=true", async () => {
    const on = new FormData();
    on.set("enabled", "true");
    await setDigestPreference(on);
    expect(setEmailDigest).toHaveBeenLastCalledWith("user-1", true);

    const other = new FormData();
    other.set("enabled", "yes");
    await setDigestPreference(other);
    expect(setEmailDigest).toHaveBeenLastCalledWith("user-1", false);
  });
});
