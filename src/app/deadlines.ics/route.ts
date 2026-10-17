import { getResourcesWithDeadlines } from "@/lib/resources";
import { buildIcsFeed, FEED_CACHE_CONTROL } from "@/lib/deadline-feeds";

// Unauthenticated, 1-hour cached iCalendar feed (issue #80): students
// subscribe in Google Calendar, Apple Calendar, or Outlook without an
// account. Deadlines change when admins edit resources, so this is never
// statically prerendered.
export const dynamic = "force-dynamic";

export async function GET() {
  const resources = await getResourcesWithDeadlines();
  const body = buildIcsFeed(resources);
  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Cache-Control": FEED_CACHE_CONTROL,
    },
  });
}
