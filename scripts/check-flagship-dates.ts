// Flags curated flagship opportunities whose dates need a refresh (issue #120).
//
// A pure check: it reads the hand-verified data in
// src/lib/flagship-opportunities.ts and lists entries needing attention,
// each with a reason:
//   - the deadline has passed (the next cycle is expected around its
//     `recurrence` month)
//   - there is no date yet and the program's usual month has arrived
//
// Mentorship programs have no deadlines and are never flagged.
//
// Run with `pnpm check:flagship-dates`. Exits non-zero when stale entries
// exist so it can run in CI; the curated data itself is never modified.
import { FLAGSHIP_OPPORTUNITIES } from "../src/lib/flagship-opportunities";
import type { FlagshipOpportunity } from "../src/lib/flagship-opportunities";

const MONTH_ABBRS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

type MonthAbbr = (typeof MONTH_ABBRS)[number];

function recurrenceMonths(recurrence: string): MonthAbbr[] {
  const months: MonthAbbr[] = [];
  for (const part of recurrence.split(/[&,/]/)) {
    const abbr = part.trim().slice(0, 3);
    const canonical = (abbr.charAt(0).toUpperCase() + abbr.slice(1).toLowerCase()) as MonthAbbr;
    if (MONTH_ABBRS.includes(canonical) && !months.includes(canonical)) {
      months.push(canonical);
    }
  }
  return months;
}

export type StaleFlag = {
  opportunity: FlagshipOpportunity;
  reason: string;
};

export function checkStaleFlagships(
  opportunities: FlagshipOpportunity[],
  today: Date,
): StaleFlag[] {
  const todayStr = today.toISOString().slice(0, 10); // YYYY-MM-DD, UTC
  const currentMonth = MONTH_ABBRS[today.getUTCMonth()];
  const flags: StaleFlag[] = [];

  for (const opp of opportunities) {
    // Mentorship programs have no deadlines and are never flagged.
    if (opp.kind === "mentorship") continue;

    if (opp.deadline && opp.deadline < todayStr) {
      const months = opp.recurrence ? recurrenceMonths(opp.recurrence) : [];
      flags.push({
        opportunity: opp,
        reason:
          months.length > 0
            ? `deadline ${opp.deadline} has passed; next cycle expected around ${months.join(" / ")} — update the dates for the new cycle`
            : `deadline ${opp.deadline} has passed; no recurrence month recorded — re-verify the dates on the source page`,
      });
      continue;
    }

    if (!opp.deadline && !opp.opensAt) {
      const months = opp.recurrence ? recurrenceMonths(opp.recurrence) : [];
      if (months.includes(currentMonth)) {
        flags.push({
          opportunity: opp,
          reason: `no dates yet and the program's usual month (${months.join(" / ")}) has arrived — check the source page for this cycle's announcement`,
        });
      }
    }
  }

  return flags;
}

function main(): void {
  const stale = checkStaleFlagships(FLAGSHIP_OPPORTUNITIES, new Date());

  if (stale.length === 0) {
    console.log("All flagship opportunity dates look fresh.");
    return;
  }

  console.log(`Curated flagship opportunities needing a refresh (${stale.length}):\n`);
  for (const { opportunity, reason } of stale) {
    console.log(`- ${opportunity.name} (${opportunity.slug})`);
    console.log(`  reason: ${reason}`);
    console.log(`  source: ${opportunity.source}`);
  }

  process.exitCode = 1;
}

main();
