import { getResourceBySlug } from "@/lib/resources";

// CDN-friendly caching for the single-resource endpoint (part of the
// public API expansion in #82): lookups are cheap and detail pages are
// read-heavy.
const CACHE_CONTROL = "public, s-maxage=60, stale-while-revalidate=300";

/**
 * GET /api/resources/[id]
 *
 * Returns the full details of a single approved resource by its slug
 * (same resolver that backs /r/[slug]). Unknown or unapproved slugs
 * answer 404.
 *
 * The handler lives under the existing [id] segment (shared with the
 * click-tracking route) because Next.js rejects two different dynamic
 * segment names at the same level — the segment value is treated as a
 * slug here.
 *
 * Part of the public API expansion tracked in #82 (this PR implements
 * the single-resource slice only; query filters, /llms.txt, and the
 * community freshness pieces remain open on that issue).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: slug } = await params;
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
