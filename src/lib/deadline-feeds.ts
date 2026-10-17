import type { Resource } from "./resources";

// ICS + RSS serialization for the /deadlines.ics and /deadlines.rss feeds
// (issue #80). Pure functions — the route handlers are thin wrappers — so
// the serialization is unit-testable without a request context.

export const FEED_CACHE_CONTROL =
  "public, s-maxage=3600, stale-while-revalidate=86400";

// Absolute URLs in feeds need an origin. Overridable without a redeploy;
// Vercel provides VERCEL_URL automatically.
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel}`;
  return "https://studentstack.vercel.app";
}

export function resourceUrl(r: Resource, origin: string): string {
  return r.url ?? `${origin}/deadlines`;
}

// RFC 5545 §3.3.11: escape backslash, semicolon, comma, and newlines in
// TEXT values.
export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

// RFC 5545 §3.1: fold content lines longer than 75 octets by inserting
// CRLF + a single space. (ASCII-only values here, so chars == octets.)
export function foldIcsLine(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [];
  let rest = line;
  parts.push(rest.slice(0, 75));
  rest = rest.slice(75);
  while (rest.length > 74) {
    parts.push(" " + rest.slice(0, 74));
    rest = rest.slice(74);
  }
  parts.push(" " + rest);
  return parts.join("\r\n");
}

function icsDate(ms: number): string {
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

function icsDateTime(ms: number): string {
  const d = new Date(ms);
  const h = String(d.getUTCHours()).padStart(2, "0");
  const min = String(d.getUTCMinutes()).padStart(2, "0");
  const s = String(d.getUTCSeconds()).padStart(2, "0");
  return `${icsDate(ms)}T${h}${min}${s}Z`;
}

function eventDescription(r: Resource, origin: string): string {
  const bits: string[] = [];
  if (r.tagline) bits.push(r.tagline);
  if (r.amount) bits.push(`Value: ${r.amount}`);
  if (r.provider) bits.push(`Provider: ${r.provider}`);
  bits.push(`Details: ${resourceUrl(r, origin)}`);
  return bits.join(" — ");
}

function icsEvent(r: Resource, origin: string, dtstamp: string): string {
  const deadline = r.deadline as number;
  const lines = [
    "BEGIN:VEVENT",
    `UID:deadline-${r.id}@studentstack`,
    `DTSTAMP:${dtstamp}`,
    // Deadlines are date-level; all-day events avoid timezone confusion.
    `DTSTART;VALUE=DATE:${icsDate(deadline)}`,
    `SUMMARY:${escapeIcsText(`[StudentStack] ${r.name} deadline`)}`,
    `DESCRIPTION:${escapeIcsText(eventDescription(r, origin))}`,
    `URL:${escapeIcsText(resourceUrl(r, origin))}`,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    // Remind one day before the deadline (issue #80 acceptance criteria).
    "TRIGGER:-P1D",
    `DESCRIPTION:${escapeIcsText(`[StudentStack] ${r.name} deadline tomorrow`)}`,
    "END:VALARM",
    "END:VEVENT",
  ];
  return lines.map(foldIcsLine).join("\r\n");
}

// Every approved resource carrying a deadline, soonest first — students
// subscribe once and get the whole deadline calendar.
export function buildIcsFeed(
  resources: Resource[],
  opts: { origin?: string; nowMs?: number } = {},
): string {
  const origin = opts.origin ?? siteUrl();
  const dtstamp = icsDateTime(opts.nowMs ?? Date.now());
  const withDeadlines = resources
    .filter((r) => r.deadline !== null)
    .sort((a, b) => (a.deadline as number) - (b.deadline as number));
  const head = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//StudentStack//Deadlines//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:StudentStack Deadlines",
  ].map(foldIcsLine);
  const events = withDeadlines.map((r) => icsEvent(r, origin, dtstamp));
  return [...head, ...events, "END:VCALENDAR"].join("\r\n") + "\r\n";
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function rssDate(ms: number): string {
  return new Date(ms).toUTCString();
}

// Upcoming deadlines only (past ones are noise in a reader), soonest first.
export function buildRssFeed(
  resources: Resource[],
  opts: { origin?: string; nowMs?: number } = {},
): string {
  const origin = opts.origin ?? siteUrl();
  const nowMs = opts.nowMs ?? Date.now();
  const upcoming = resources
    .filter((r) => r.deadline !== null && r.deadline > nowMs)
    .sort((a, b) => (a.deadline as number) - (b.deadline as number));
  const items = upcoming
    .map((r) => {
      const deadline = r.deadline as number;
      const descBits: string[] = [];
      if (r.tagline) descBits.push(r.tagline);
      if (r.amount) descBits.push(`Value: ${r.amount}`);
      if (r.provider) descBits.push(`Provider: ${r.provider}`);
      descBits.push(`Deadline: ${new Date(deadline).toUTCString()}`);
      const link = resourceUrl(r, origin);
      return [
        "    <item>",
        `      <title>${escapeXml(`[StudentStack] ${r.name} — deadline ${new Date(deadline).toISOString().slice(0, 10)}`)}</title>`,
        `      <link>${escapeXml(link)}</link>`,
        `      <guid isPermaLink="false">studentstack-deadline-${r.id}</guid>`,
        `      <pubDate>${rssDate(deadline)}</pubDate>`,
        `      <description>${escapeXml(descBits.join(" — "))}</description>`,
        "    </item>",
      ].join("\n");
    })
    .join("\n");
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0">',
    "  <channel>",
    "    <title>StudentStack Deadlines</title>",
    `    <link>${escapeXml(`${origin}/deadlines`)}</link>`,
    "    <description>Scholarship, internship, and student-offer deadlines from StudentStack, soonest first.</description>",
    `    <lastBuildDate>${rssDate(nowMs)}</lastBuildDate>`,
    items,
    "  </channel>",
    "</rss>",
    "",
  ].join("\n");
}
