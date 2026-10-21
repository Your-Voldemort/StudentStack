"use server";

import { revalidatePath } from "next/cache";
import { deleteBookmark, isApprovedResource, upsertBookmark } from "@/lib/bookmarks";
import { isBookmarkStatus, type BookmarkStatus } from "@/lib/bookmark-status";
import { getOrCreateCalendarToken, rotateCalendarToken, setEmailDigest } from "@/lib/profiles";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type BookmarkActionResult = { ok: true } | { ok: false; reason: "signed_out" | "invalid" | "failed" };

// Server Functions are reachable directly, so each one re-checks the
// session and validates its arguments instead of trusting the caller.
async function currentUserId(): Promise<string | null> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

function validResourceId(id: unknown): id is number {
  return typeof id === "number" && Number.isInteger(id) && id > 0;
}

export async function saveBookmark(resourceId: number, status: BookmarkStatus = "interested"): Promise<BookmarkActionResult> {
  try {
    const userId = await currentUserId();
    if (!userId) return { ok: false, reason: "signed_out" };
    if (!validResourceId(resourceId) || !isBookmarkStatus(status)) return { ok: false, reason: "invalid" };
    if (!(await isApprovedResource(resourceId))) return { ok: false, reason: "invalid" };
    await upsertBookmark(userId, resourceId, status);
  } catch (error) {
    console.warn("[bookmarks] save failed:", error instanceof Error ? error.message : error);
    return { ok: false, reason: "failed" };
  }
  revalidatePath("/my-list");
  return { ok: true };
}

export async function removeBookmark(resourceId: number): Promise<BookmarkActionResult> {
  try {
    const userId = await currentUserId();
    if (!userId) return { ok: false, reason: "signed_out" };
    if (!validResourceId(resourceId)) return { ok: false, reason: "invalid" };
    await deleteBookmark(userId, resourceId);
  } catch (error) {
    console.warn("[bookmarks] remove failed:", error instanceof Error ? error.message : error);
    return { ok: false, reason: "failed" };
  }
  revalidatePath("/my-list");
  return { ok: true };
}

// Per-user deadlines feed (issue #84). Form actions: /my-list re-renders
// with the subscribe URL afterwards.
export async function enableCalendarFeed(): Promise<void> {
  const userId = await currentUserId();
  if (!userId) return;
  await getOrCreateCalendarToken(userId);
  revalidatePath("/my-list");
}

export async function resetCalendarFeed(): Promise<void> {
  const userId = await currentUserId();
  if (!userId) return;
  await rotateCalendarToken(userId);
  revalidatePath("/my-list");
}

// Weekly digest on/off (issue #38).
export async function setDigestPreference(formData: FormData): Promise<void> {
  const userId = await currentUserId();
  if (!userId) return;
  await setEmailDigest(userId, formData.get("enabled") === "true");
  revalidatePath("/my-list");
}
