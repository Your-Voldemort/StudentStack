import type { Resource } from "./resources";

// A deadline this close (in days) gets the visually distinct "closing
// soon" treatment on /deadlines (issue #32 acceptance criteria).
export const CLOSING_SOON_DAYS = 14;

const DAY_MS = 86_400_000;

export function isPastDeadline(deadlineMs: number, nowMs: number = Date.now()): boolean {
  return deadlineMs <= nowMs;
}

export function isClosingSoon(deadlineMs: number, nowMs: number = Date.now()): boolean {
  return deadlineMs > nowMs && deadlineMs - nowMs <= CLOSING_SOON_DAYS * DAY_MS;
}

export type DeadlineBuckets = {
  closingSoon: Resource[];
  upcoming: Resource[];
  past: Resource[];
};

// Splits deadline-bearing resources into the /deadlines page sections,
// each sorted soonest-first. Resources without a deadline are ignored.
export function partitionDeadlines(
  resources: Resource[],
  nowMs: number = Date.now(),
): DeadlineBuckets {
  const buckets: DeadlineBuckets = { closingSoon: [], upcoming: [], past: [] };
  for (const resource of resources) {
    if (resource.deadline === null) continue;
    if (isPastDeadline(resource.deadline, nowMs)) buckets.past.push(resource);
    else if (isClosingSoon(resource.deadline, nowMs)) buckets.closingSoon.push(resource);
    else buckets.upcoming.push(resource);
  }
  const byDeadline = (a: Resource, b: Resource) =>
    (a.deadline as number) - (b.deadline as number);
  buckets.closingSoon.sort(byDeadline);
  buckets.upcoming.sort(byDeadline);
  buckets.past.sort(byDeadline);
  return buckets;
}

const DATE_FORMAT = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export function formatDeadline(deadlineMs: number): string {
  return DATE_FORMAT.format(new Date(deadlineMs));
}

const RELATIVE_FORMAT = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

// "in 5 days" / "tomorrow" / "3 days ago" — the human line under each card.
export function relativeDeadline(deadlineMs: number, nowMs: number = Date.now()): string {
  const days = Math.round((deadlineMs - nowMs) / DAY_MS);
  return RELATIVE_FORMAT.format(days, "day");
}
