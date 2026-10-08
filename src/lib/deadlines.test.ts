import { describe, it, expect } from "vitest";
import {
  CLOSING_SOON_DAYS,
  formatDeadline,
  isClosingSoon,
  isPastDeadline,
  partitionDeadlines,
  relativeDeadline,
} from "./deadlines";
import type { Resource } from "./resources";

const NOW = new Date("2026-10-08T12:00:00Z").getTime();
const DAY = 86_400_000;

function makeResource(deadline: number | null): Resource {
  return {
    id: 1,
    slug: "sample",
    name: "Sample",
    tagline: null,
    description: "A sample resource.",
    url: "https://example.com",
    hasStaticClaimUrl: true,
    categoryId: 1,
    categorySlug: "development-tools",
    categoryName: "Development Tools",
    categoryIcon: "dev",
    tags: [],
    region: "Global",
    costType: "free",
    verificationNeeded: null,
    creditCardRequired: null,
    duration: null,
    status: "active",
    lastVerifiedAt: null,
    deadline,
  };
}

describe("isPastDeadline", () => {
  it("treats a deadline at or before now as past", () => {
    expect(isPastDeadline(NOW - DAY, NOW)).toBe(true);
    expect(isPastDeadline(NOW, NOW)).toBe(true);
  });

  it("treats a future deadline as not past", () => {
    expect(isPastDeadline(NOW + DAY, NOW)).toBe(false);
  });
});

describe("isClosingSoon", () => {
  it("is true for deadlines within the closing-soon window", () => {
    expect(isClosingSoon(NOW + DAY, NOW)).toBe(true);
    expect(isClosingSoon(NOW + CLOSING_SOON_DAYS * DAY, NOW)).toBe(true);
  });

  it("is false for deadlines beyond the window", () => {
    expect(isClosingSoon(NOW + (CLOSING_SOON_DAYS + 1) * DAY, NOW)).toBe(false);
  });

  it("is false for past deadlines", () => {
    expect(isClosingSoon(NOW - DAY, NOW)).toBe(false);
  });
});

describe("partitionDeadlines", () => {
  it("splits resources into closing-soon, upcoming, and past buckets", () => {
    const resources = [
      makeResource(NOW + 60 * DAY),
      makeResource(null),
      makeResource(NOW + 3 * DAY),
      makeResource(NOW - 5 * DAY),
      makeResource(NOW + 30 * DAY),
      makeResource(NOW - DAY),
      makeResource(NOW + DAY),
    ];
    const { closingSoon, upcoming, past } = partitionDeadlines(resources, NOW);
    expect(closingSoon.map((r) => r.deadline)).toEqual([NOW + DAY, NOW + 3 * DAY]);
    expect(upcoming.map((r) => r.deadline)).toEqual([NOW + 30 * DAY, NOW + 60 * DAY]);
    expect(past.map((r) => r.deadline)).toEqual([NOW - 5 * DAY, NOW - DAY]);
  });

  it("ignores resources without a deadline", () => {
    const { closingSoon, upcoming, past } = partitionDeadlines([makeResource(null)], NOW);
    expect(closingSoon).toEqual([]);
    expect(upcoming).toEqual([]);
    expect(past).toEqual([]);
  });
});

describe("formatDeadline", () => {
  it("formats as a short date", () => {
    expect(formatDeadline(new Date("2026-12-25T00:00:00Z").getTime())).toBe("Dec 25, 2026");
  });
});

describe("relativeDeadline", () => {
  it("describes future and past deadlines in days", () => {
    expect(relativeDeadline(NOW + 5 * DAY, NOW)).toBe("in 5 days");
    expect(relativeDeadline(NOW - 3 * DAY, NOW)).toBe("3 days ago");
  });
});
