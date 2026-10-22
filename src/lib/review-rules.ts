// Pure review rules (issue #37), shared by the Server Actions and tests.

export const MAX_COMMENT_LENGTH = 1000;

export type ReviewInput = { rating: number; comment: string | null };

export function validateReview(
  rawRating: unknown,
  rawComment: unknown,
): { ok: true; value: ReviewInput } | { ok: false; error: string } {
  const rating = Number(rawRating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { ok: false, error: "Pick a rating from 1 to 5 stars." };
  }
  const comment = typeof rawComment === "string" ? rawComment.trim() : "";
  if (comment.length > MAX_COMMENT_LENGTH) {
    return { ok: false, error: `Keep your review under ${MAX_COMMENT_LENGTH} characters.` };
  }
  return { ok: true, value: { rating, comment: comment || null } };
}

// Academic email domains for the "Verified student" badge: .edu, .edu.xx,
// .ac.xx (e.g. .ac.in, .ac.uk), plus India's .edu.in and .ernet.in.
export function isAcademicEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const domain = email.toLowerCase().split("@")[1] ?? "";
  return /(^|\.)edu(\.[a-z]{2})?$/.test(domain) || /(^|\.)ac\.[a-z]{2}$/.test(domain) || domain.endsWith(".ernet.in");
}

export type RatingSummary = { average: number; count: number };

export function formatRating(summary: RatingSummary): string {
  return `${summary.average.toFixed(1)} ★ (${summary.count} review${summary.count === 1 ? "" : "s"})`;
}

// Review list sorts on /r/[slug] (?reviews=). Anything unknown falls back
// to most recent.
export type ReviewSort = "recent" | "highest" | "helpful";

export function parseReviewSort(raw: unknown): ReviewSort {
  return raw === "highest" || raw === "helpful" ? raw : "recent";
}

// "Helpful" vote arguments (issue #119), checked before any database work.
export function validateHelpfulVote(
  reviewId: unknown,
  helpful: unknown,
): { ok: true; value: { reviewId: number; helpful: boolean } } | { ok: false; error: string } {
  if (typeof reviewId !== "number" || !Number.isInteger(reviewId) || reviewId <= 0) {
    return { ok: false, error: "That review no longer exists." };
  }
  if (typeof helpful !== "boolean") return { ok: false, error: "Something went wrong. Try again." };
  return { ok: true, value: { reviewId, helpful } };
}
