import { eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";

/**
 * POST /api/resources/[id]/click
 * Records a "View offer" click: inserts a click_events row and increments
 * the denormalized click_count on the resource. Anonymous clicks are allowed
 * (user_id is nullable). Fire-and-forget from the client — never blocks.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const resourceId = Number(id);
  if (!Number.isInteger(resourceId) || resourceId <= 0) {
    return Response.json({ error: "Invalid resource id" }, { status: 400 });
  }

  await db.insert(schema.clickEvents).values({ resourceId });

  await db
    .update(schema.resources)
    .set({ clickCount: sql`${schema.resources.clickCount} + 1` })
    .where(eq(schema.resources.id, resourceId));

  return Response.json({ ok: true });
}
