import { getResourcesWithDeadlines } from "@/lib/resources";
import { buildRssFeed, FEED_CACHE_CONTROL } from "@/lib/deadline-feeds";

// Unauthenticated, 1-hour cached RSS 2.0 feed of upcoming deadlines
// (issue #80): students follow in any RSS reader without an account.
// Same force-dynamic treatment as /deadlines.ics — deadlines change when
// admins edit resources.
export const dynamic = "force-dynamic";

export async function GET() {
  const resources = await getResourcesWithDeadlines();
  const body = buildRssFeed(resources);
  return new Response(body, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": FEED_CACHE_CONTROL,
    },
  });
}
