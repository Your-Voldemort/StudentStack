const RTF = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
const DAY_MS = 86_400_000;

export function relativeTime(ms: number | null): string {
  if (ms === null) return "Not yet verified";
  const days = Math.round((ms - Date.now()) / DAY_MS);
  return `Verified ${RTF.format(days, "day")}`;
}
