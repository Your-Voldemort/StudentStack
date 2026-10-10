import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  getResourcesPaginated,
} from "@/lib/resources";

function parsePageParam(raw: string | null): number | null {
  if (raw === null) return 1;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1) return null;
  return value;
}

function parseLimitParam(raw: string | null): number | null {
  if (raw === null) return DEFAULT_PAGE_SIZE;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1) return null;
  return Math.min(value, MAX_PAGE_SIZE);
}

/**
 * GET /api/resources?page=&limit=
 *
 * Server-side offset pagination over approved resources (first API slice
 * of #28). Intended for clients that can't afford the full table —
 * e.g. an infinite-scroll directory UI.
 *
 * Query params:
 *   page  — 1-based page number, default 1. Must be a positive integer.
 *   limit — items per page, default 30, capped at 100. Must be a positive
 *           integer.
 *
 * Responds with `{ resources, total, page, limit, totalPages }`.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const page = parsePageParam(searchParams.get("page"));
  if (page === null) {
    return Response.json(
      { error: "Invalid 'page' query parameter: expected a positive integer" },
      { status: 400 },
    );
  }

  const limit = parseLimitParam(searchParams.get("limit"));
  if (limit === null) {
    return Response.json(
      { error: "Invalid 'limit' query parameter: expected a positive integer" },
      { status: 400 },
    );
  }

  return Response.json(await getResourcesPaginated(page, limit));
}
