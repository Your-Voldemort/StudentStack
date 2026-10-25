import { describe, it, expect } from "vitest";
import { parseReviewSort } from "@/lib/review-rules";
import { resourceReviewsQuery } from "@/lib/reviews";

// The list query is compiled to SQL without running it (the postgres client
// only connects on the first query), so ordering is checked with no database.
function orderBy(sort: Parameters<typeof resourceReviewsQuery>[1]): string {
  const { sql } = resourceReviewsQuery(1, sort).toSQL();
  return sql.slice(sql.indexOf("order by"), sql.indexOf(" limit"));
}

describe("parseReviewSort", () => {
  it.each(["recent", "highest", "helpful"])("keeps %s", (sort) => expect(parseReviewSort(sort)).toBe(sort));

  it.each([undefined, "", "HELPFUL", "oldest", ["helpful"]])("falls back to recent for %s", (raw) =>
    expect(parseReviewSort(raw)).toBe("recent"),
  );
});

describe("resourceReviewsQuery ordering", () => {
  it("most recent: newest first", () => {
    expect(orderBy("recent")).toBe('order by "reviews"."created_at" desc');
  });

  it("highest rated: rating, then newest", () => {
    expect(orderBy("highest")).toBe('order by "reviews"."rating" desc, "reviews"."created_at" desc');
  });

  it("most helpful: helpful count, then newest", () => {
    expect(orderBy("helpful")).toBe('order by count("review_votes"."user_id") desc, "reviews"."created_at" desc');
  });

  it("counts votes per review without selecting author ids", () => {
    const { sql } = resourceReviewsQuery(1, "helpful").toSQL();
    expect(sql).toContain('left join "review_votes" on "review_votes"."review_id" = "reviews"."id"');
    expect(sql).toContain('group by "reviews"."id"');
    expect(sql.slice(0, sql.indexOf(" from "))).not.toContain('"reviews"."user_id"');
  });
});
