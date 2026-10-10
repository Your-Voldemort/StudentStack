// Pure pagination primitives for #28 (server-side offset pagination).
//
// Kept free of database imports so the math is unit-testable without a
// live database — the same "pure and separate" pattern as link-health's
// classifyCheck. The DB-backed query layer in resources.ts consumes these.

export const DEFAULT_PAGE_SIZE = 30;
export const MAX_PAGE_SIZE = 100;

export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

// Normalizes raw caller input (e.g. URL query params) into a safe
// page/limit pair instead of sending a bad offset/limit to the database.
// Garbage becomes the defaults; an oversized limit is clamped to the max.
export function normalizePagination(
  page: unknown,
  limit: unknown,
): { page: number; limit: number } {
  const safePage = Number.isInteger(page) && (page as number) > 0 ? (page as number) : 1;
  const safeLimit =
    Number.isInteger(limit) && (limit as number) > 0
      ? Math.min(limit as number, MAX_PAGE_SIZE)
      : DEFAULT_PAGE_SIZE;
  return { page: safePage, limit: safeLimit };
}

// Offset-based slice of an already-ordered list (Option A from #28).
export function paginate<T>(all: T[], page: unknown, limit: unknown): Paginated<T> {
  const { page: safePage, limit: safeLimit } = normalizePagination(page, limit);
  const offset = (safePage - 1) * safeLimit;
  const total = all.length;
  return {
    items: all.slice(offset, offset + safeLimit),
    total,
    page: safePage,
    limit: safeLimit,
    totalPages: Math.max(1, Math.ceil(total / safeLimit)),
  };
}
