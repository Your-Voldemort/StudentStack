// Flags curated flagship opportunities whose dates need a refresh (issue #120).
//
// A pure check: it reads the hand-verified data in
// src/lib/flagship-opportunities.ts and lists the entries needing
// attention, each with its reasons. The rules live in
// src/lib/flagship-freshness.ts (`flagshipsNeedingRefresh`) — the same
// helper the admin dashboard and the weekly link-health webhook use —
// so this CLI and the dashboard always agree on what is stale.
//
// Run with `pnpm check:flagship-dates`. Exits non-zero when entries need
// a refresh so it can run in CI; the curated data itself is never modified.
import { FLAGSHIP_OPPORTUNITIES } from "../src/lib/flagship-opportunities";
import { flagshipsNeedingRefresh } from "../src/lib/flagship-freshness";

function main(): void {
  const stale = flagshipsNeedingRefresh(FLAGSHIP_OPPORTUNITIES, new Date());

  if (stale.length === 0) {
    console.log("All flagship opportunity dates look fresh.");
    return;
  }

  console.log(`Curated flagship opportunities needing a refresh (${stale.length}):\n`);
  for (const entry of stale) {
    console.log(`- ${entry.name} (${entry.slug})`);
    console.log(`  reason: ${entry.reasons.map((r) => r.message).join("; ")}`);
    console.log(`  source: ${entry.source}`);
  }

  process.exitCode = 1;
}

main();
