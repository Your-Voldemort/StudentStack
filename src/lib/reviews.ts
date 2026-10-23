import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import type { RatingSummary, ReviewInput, ReviewSort } from "@/lib/review-rules";

// Reviews + ratings (PRD §8.11, issue #37). The app connects as the table
// owner, so the rules RLS would enforce live in the Server Actions: only
// the signed-in author writes their own row, and reads are public.

const reviews = schema.reviews;
const reviewVotes = schema.reviewVotes;

export type PublicReview = {
  id: number;
  rating: number;
  comment: string | null;
  verifiedStudent: boolean;
  createdAt: Date;
  helpfulCount: number;
};

export type { ReviewSort };

function hasDatabase(): boolean {
  return Boolean(process.env.POSTGRES_URL);
}

// One aggregate query for the whole directory.
export async function getRatingSummaries(): Promise<Record<number, RatingSummary>> {
  if (!hasDatabase()) return {};
  try {
    const rows = await db
      .select({
        resourceId: reviews.resourceId,
        average: sql<number>`avg(${reviews.rating})`,
        count: sql<number>`count(*)`,
      })
      .from(reviews)
      .groupBy(reviews.resourceId);
    return Object.fromEntries(
      rows.map((r) => [r.resourceId, { average: Number(r.average), count: Number(r.count) }]),
    );
  } catch (error) {
    console.warn("[reviews] summaries failed:", error instanceof Error ? error.message : error);
    return {};
  }
}

export async function getRatingSummary(resourceId: number): Promise<RatingSummary | null> {
  if (!hasDatabase()) return null;
  try {
    const [row] = await db
      .select({ average: sql<number>`avg(${reviews.rating})`, count: sql<number>`count(*)` })
      .from(reviews)
      .where(eq(reviews.resourceId, resourceId));
    const count = Number(row?.count ?? 0);
    return count > 0 ? { average: Number(row.average), count } : null;
  } catch (error) {
    console.warn("[reviews] summary failed:", error instanceof Error ? error.message : error);
    return null;
  }
}

const helpfulCount = sql<number>`count(${reviewVotes.userId})`.mapWith(Number);

function reviewOrder(sort: ReviewSort) {
  if (sort === "highest") return [desc(reviews.rating), desc(reviews.createdAt)];
  if (sort === "helpful") return [desc(helpfulCount), desc(reviews.createdAt)];
  return [desc(reviews.createdAt)];
}

// Author ids are never exposed: reviews show as anonymous students.
// Exported for the ordering test, which compiles it without a database.
export function resourceReviewsQuery(resourceId: number, sort: ReviewSort) {
  return db
    .select({
      id: reviews.id,
      rating: reviews.rating,
      comment: reviews.comment,
      verifiedStudent: reviews.verifiedStudent,
      createdAt: reviews.createdAt,
      helpfulCount,
    })
    .from(reviews)
    .leftJoin(reviewVotes, eq(reviewVotes.reviewId, reviews.id))
    .where(eq(reviews.resourceId, resourceId))
    .groupBy(reviews.id)
    .orderBy(...reviewOrder(sort))
    .limit(50);
}

export async function getResourceReviews(resourceId: number, sort: ReviewSort = "recent"): Promise<PublicReview[]> {
  if (!hasDatabase()) return [];
  try {
    return await resourceReviewsQuery(resourceId, sort);
  } catch (error) {
    console.warn("[reviews] list failed:", error instanceof Error ? error.message : error);
    return [];
  }
}

export async function getUserReview(userId: string, resourceId: number) {
  const [row] = await db
    .select({ rating: reviews.rating, comment: reviews.comment })
    .from(reviews)
    .where(and(eq(reviews.userId, userId), eq(reviews.resourceId, resourceId)))
    .limit(1);
  return row ?? null;
}

export async function hasBookmarked(userId: string, resourceId: number): Promise<boolean> {
  const [row] = await db
    .select({ resourceId: schema.bookmarks.resourceId })
    .from(schema.bookmarks)
    .where(and(eq(schema.bookmarks.userId, userId), eq(schema.bookmarks.resourceId, resourceId)))
    .limit(1);
  return Boolean(row);
}

export async function upsertReview(
  userId: string,
  resourceId: number,
  input: ReviewInput,
  verifiedStudent: boolean,
): Promise<void> {
  const now = new Date();
  await db
    .insert(reviews)
    .values({ userId, resourceId, ...input, verifiedStudent, updatedAt: now })
    .onConflictDoUpdate({
      target: [reviews.resourceId, reviews.userId],
      set: { ...input, verifiedStudent, updatedAt: now },
    });
}

export async function deleteReview(userId: string, resourceId: number): Promise<void> {
  await db.delete(reviews).where(and(eq(reviews.userId, userId), eq(reviews.resourceId, resourceId)));
}

// The review a vote targets, with its author, so the Server Action can
// refuse votes on the student's own review. Never sent to the client.
export async function getReviewForVote(reviewId: number): Promise<{ userId: string; resourceId: number } | null> {
  const [row] = await db
    .select({ userId: reviews.userId, resourceId: reviews.resourceId })
    .from(reviews)
    .where(eq(reviews.id, reviewId))
    .limit(1);
  return row ?? null;
}

export async function addHelpfulVote(userId: string, reviewId: number): Promise<void> {
  await db.insert(reviewVotes).values({ userId, reviewId }).onConflictDoNothing();
}

export async function removeHelpfulVote(userId: string, reviewId: number): Promise<void> {
  await db.delete(reviewVotes).where(and(eq(reviewVotes.userId, userId), eq(reviewVotes.reviewId, reviewId)));
}

// The signed-in student's side of a resource's reviews: which ones they
// marked helpful and which one (if any) is theirs.
export async function getViewerReviewState(
  userId: string,
  resourceId: number,
): Promise<{ voted: number[]; mine: number | null }> {
  const [voted, own] = await Promise.all([
    db
      .select({ reviewId: reviewVotes.reviewId })
      .from(reviewVotes)
      .innerJoin(reviews, eq(reviews.id, reviewVotes.reviewId))
      .where(and(eq(reviewVotes.userId, userId), eq(reviews.resourceId, resourceId))),
    db
      .select({ id: reviews.id })
      .from(reviews)
      .where(and(eq(reviews.userId, userId), eq(reviews.resourceId, resourceId)))
      .limit(1),
  ]);
  return { voted: voted.map((v) => v.reviewId), mine: own[0]?.id ?? null };
}
