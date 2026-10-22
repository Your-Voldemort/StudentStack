"use server";

import { revalidatePath } from "next/cache";
import { isApprovedResource } from "@/lib/bookmarks";
import { isAcademicEmail, validateHelpfulVote, validateReview } from "@/lib/review-rules";
import {
  addHelpfulVote,
  deleteReview,
  getReviewForVote,
  getUserReview,
  hasBookmarked,
  removeHelpfulVote,
  upsertReview,
} from "@/lib/reviews";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type ReviewActionResult = { ok: true } | { ok: false; error: string };

async function currentUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

function validId(id: unknown): id is number {
  return typeof id === "number" && Number.isInteger(id) && id > 0;
}

// Create or update the signed-in student's review. Only students who saved
// the resource to their list (#33) can review it: that's the closest
// signal we have that they actually used it.
export async function submitReview(
  resourceId: number,
  slug: string,
  rating: number,
  comment: string,
): Promise<ReviewActionResult> {
  const user = await currentUser();
  if (!user) return { ok: false, error: "Sign in to write a review." };
  if (!validId(resourceId)) return { ok: false, error: "That offer no longer exists." };
  const parsed = validateReview(rating, comment);
  if (!parsed.ok) return parsed;
  try {
    if (!(await isApprovedResource(resourceId))) return { ok: false, error: "That offer no longer exists." };
    // An existing review stays editable even if the bookmark was removed.
    if (!(await hasBookmarked(user.id, resourceId)) && !(await getUserReview(user.id, resourceId))) {
      return { ok: false, error: "Save this offer to your list first, then review it." };
    }
    await upsertReview(user.id, resourceId, parsed.value, isAcademicEmail(user.email));
  } catch (error) {
    console.warn("[reviews] save failed:", error instanceof Error ? error.message : error);
    return { ok: false, error: "We couldn’t save your review. Try again." };
  }
  revalidatePath(`/r/${slug}`);
  revalidatePath("/directory");
  return { ok: true };
}

export async function deleteMyReview(resourceId: number, slug: string): Promise<ReviewActionResult> {
  const user = await currentUser();
  if (!user) return { ok: false, error: "Sign in again to delete your review." };
  if (!validId(resourceId)) return { ok: false, error: "That offer no longer exists." };
  try {
    await deleteReview(user.id, resourceId);
  } catch (error) {
    console.warn("[reviews] delete failed:", error instanceof Error ? error.message : error);
    return { ok: false, error: "We couldn’t delete your review. Try again." };
  }
  revalidatePath(`/r/${slug}`);
  revalidatePath("/directory");
  return { ok: true };
}

// Mark (or unmark) a review as helpful (issue #119). The author check runs
// here, against the stored review, because the client never sees author ids.
// No revalidatePath: /r/[slug] renders per request and the button updates
// its own count.
export async function setHelpfulVote(reviewId: number, helpful: boolean): Promise<ReviewActionResult> {
  const user = await currentUser();
  if (!user) return { ok: false, error: "Sign in to mark reviews as helpful." };
  const parsed = validateHelpfulVote(reviewId, helpful);
  if (!parsed.ok) return parsed;
  try {
    const review = await getReviewForVote(parsed.value.reviewId);
    if (!review || !(await isApprovedResource(review.resourceId))) {
      return { ok: false, error: "That review no longer exists." };
    }
    if (review.userId === user.id) return { ok: false, error: "You can’t vote on your own review." };
    if (parsed.value.helpful) await addHelpfulVote(user.id, parsed.value.reviewId);
    else await removeHelpfulVote(user.id, parsed.value.reviewId);
  } catch (error) {
    console.warn("[reviews] vote failed:", error instanceof Error ? error.message : error);
    return { ok: false, error: "We couldn’t save your vote. Try again." };
  }
  return { ok: true };
}
