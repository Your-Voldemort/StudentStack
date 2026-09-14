const RTF = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
const DAY_MS = 86_400_000;

// Returns null (not a string) when never verified, so the caller can
// render nothing instead of a "Not yet verified" label — showing that on
// ~97% of cards (579/593 at time of writing) reads as "this whole
// directory is unverified" rather than surfacing real freshness signal.
export function relativeTime(ms: number | null): string | null {
  if (ms === null) return null;
  const days = Math.round((ms - Date.now()) / DAY_MS);
  return `Verified ${RTF.format(days, "day")}`;
}

if (process.argv[1] && process.argv[1].endsWith("format.ts")) {
  console.assert(relativeTime(null) === null, "unverified (null) should return null, not a string");
  console.assert(
    relativeTime(Date.now()) === "Verified today",
    `expected "Verified today", got ${relativeTime(Date.now())}`,
  );
  const twoDaysAgo = Date.now() - 2 * DAY_MS;
  console.assert(
    relativeTime(twoDaysAgo) === "Verified 2 days ago",
    `expected "Verified 2 days ago", got ${relativeTime(twoDaysAgo)}`,
  );
  console.log("OK: format.ts self-check passed");
}
