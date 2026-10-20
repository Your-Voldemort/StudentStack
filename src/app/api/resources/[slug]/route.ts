import { getResourceBySlug } from "@/lib/resources";

// CDN-friendly caching for the single-resource endpoint (part of the
// public API expansion in #82): lookups are cheap and detail pages are
// read-heavy.
const CACHE_CONTROL = "public, s-maxage=60, stale-while-revalidate=300";

/**
 * GET /api/resources/[slug]
 *
 * Returns the full details of a single approved resource by its slug
 * (same resolver that backs /r/[slug]). Unknown or unapproved slugs
 * answer 404.
 *
 * Part of the public API expansion tracked in #82 (this PR implements
 * the single-resource slice only; query filters, /llms.txt, and the
 * community freshness pieces remain open on that issue).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const resource = await getResourceBySlug(slug);

  if (!resource) {
    return Response.json(
      { error: `Resource not found: '${slug}'` },
      { status: 404, headers: { "Cache-Control": CACHE_CONTROL } },
    );
  }

  return Response.json(resource, {
    headers: { "Cache-Control": CACHE_CONTROL },
  });
}
