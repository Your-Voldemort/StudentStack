import type { FlagshipOpportunity } from "./flagship-opportunities";

// Issue #120: which hand-curated flagship programs need their dates
// re-checked on the official page. Pure (no I/O, `now` is passed in) so
// the admin dashboard and the weekly link-health cron share it.
//
// Rules, all on UTC calendar dates (YYYY-MM-DD):
// 1. Deadline passed and not verified since → "deadline passed". The
//    program now shows as a past cycle; with a recurrence the next cycle
//    is expected around that month.
// 2. Deadline passed but already re-verified after it → only flagged again
//    once the recurrence month comes round after `verifiedOn` (the next
//    cycle should be announced by then). Without this, every closed cycle
//    would be flagged every week until the next one is published.
// 3. No deadline, not mentorship, and the recurrence month has come round
//    since `verifiedOn` → "no date yet". Mentorship programs are rolling
//    and never need dates; entries without a recurrence have no expected
//    window, so only rule 4 applies to them.
// 4. `verifiedOn` missing or older than STALE_AFTER_DAYS → re-verify the
//    whole entry (applies to every kind, mentorship included).

export const STALE_AFTER_DAYS = 180;

export type FlagshipRefreshReason = {
  code: "deadline-passed" | "next-cycle-due" | "no-date" | "stale";
  message: string;
};

export type FlagshipRefreshEntry = {
  slug: string;
  name: string;
  source: string;
  reasons: FlagshipRefreshReason[];
};

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

function toDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

/**
 * The most recent first-of-month (on or before `today`) of any month named
 * in `recurrence` ("Mar", "Feb & Aug", "Oct & Mar"). Null when no month
 * can be read from it.
 */
export function latestRecurrenceStart(recurrence: string | undefined, today: string): string | null {
  if (!recurrence) return null;
  const months = [...recurrence.toLowerCase().matchAll(/[a-z]{3}/g)]
    .map((m) => MONTHS.indexOf(m[0]))
    .filter((i) => i >= 0);
  if (months.length === 0) return null;
  const year = Number(today.slice(0, 4));
  const starts = months.map((month) => {
    const start = `${year}-${String(month + 1).padStart(2, "0")}-01`;
    return start <= today ? start : `${year - 1}-${String(month + 1).padStart(2, "0")}-01`;
  });
  return starts.sort().at(-1)!;
}

/** Curated entries needing attention, each with its reasons, in file order. */
export function flagshipsNeedingRefresh(
  entries: FlagshipOpportunity[],
  now: Date,
): FlagshipRefreshEntry[] {
  const today = toDay(now);
  const result: FlagshipRefreshEntry[] = [];

  for (const entry of entries) {
    const reasons: FlagshipRefreshReason[] = [];
    const verified = entry.verifiedOn;
    const cycleStart = latestRecurrenceStart(entry.recurrence, today);
    // The window should have opened since the entry was last checked.
    const cycleSinceVerified = cycleStart !== null && (!verified || verified < cycleStart);

    if (entry.deadline && entry.deadline < today) {
      if (!verified || verified <= entry.deadline) {
        reasons.push({
          code: "deadline-passed",
          message: entry.recurrence
            ? `Deadline ${entry.deadline} passed; next cycle expected ~${entry.recurrence}, check the official page`
            : `Deadline ${entry.deadline} passed and no recurrence is set; check whether the program still runs`,
        });
      } else if (cycleSinceVerified) {
        reasons.push({
          code: "next-cycle-due",
          message: `Next cycle was expected ~${entry.recurrence}; still showing the ${entry.deadline} deadline`,
        });
      }
    } else if (!entry.deadline && entry.kind !== "mentorship" && cycleSinceVerified) {
      reasons.push({
        code: "no-date",
        message: `No date yet; the window usually opens ~${entry.recurrence}, check the official page`,
      });
    }

    if (!verified) {
      reasons.push({ code: "stale", message: "Never verified; check the official page" });
    } else if (daysBetween(verified, today) > STALE_AFTER_DAYS) {
      reasons.push({
        code: "stale",
        message: `Last verified ${verified}, over ${STALE_AFTER_DAYS} days ago`,
      });
    }

    if (reasons.length > 0) {
      result.push({ slug: entry.slug, name: entry.name, source: entry.source, reasons });
    }
  }
  return result;
}
