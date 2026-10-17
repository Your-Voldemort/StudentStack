import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/db";

// Issue #76: "Report: dead / expired / wrong" on resource cards. Reports
// are written as unapproved resource rows tagged "report" into the existing
// submissions pipeline, so admins see them immediately in the /admin review
// queue without a separate moderation table.
export const REPORT_KINDS = ["dead-link", "offer-expired", "wrong-info"] as const;
export type ReportKind = (typeof REPORT_KINDS)[number];

export const REPORT_KIND_LABEL: Record<ReportKind, string> = {
  "dead-link": "Dead link",
  "offer-expired": "Offer expired",
  "wrong-info": "Wrong info",
};

const MAX_NOTE_LENGTH = 500;

/**
 * POST /api/reports
 *
 * Body: { resourceId: number, kind: "dead-link" | "offer-expired" | "wrong-info", note?: string }
 *
 * Writes an unapproved row (approved = false) tagged "report" that lands in
 * the admin "Waiting for review" queue. The row references the reported
 * resource's slug in its tagline/description so a reviewer can act on it.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { resourceId, kind, note } = (body ?? {}) as {
    resourceId?: unknown;
    kind?: unknown;
    note?: unknown;
  };

  const id = Number(resourceId);
  if (!Number.isInteger(id) || id <= 0) {
    return Response.json({ error: "Invalid resource id" }, { status: 400 });
  }
  if (typeof kind !== "string" || !(REPORT_KINDS as readonly string[]).includes(kind)) {
    return Response.json(
      { error: `Invalid report kind (expected one of: ${REPORT_KINDS.join(", ")})` },
      { status: 400 },
    );
  }
  const reportKind = kind as ReportKind;
  const trimmedNote = typeof note === "string" ? note.trim().slice(0, MAX_NOTE_LENGTH) : "";

  const [target] = await db
    .select({
      id: schema.resources.id,
      slug: schema.resources.slug,
      name: schema.resources.name,
      url: schema.resources.url,
      categoryId: schema.resources.categoryId,
      region: schema.resources.region,
      costType: schema.resources.costType,
    })
    .from(schema.resources)
    .where(eq(schema.resources.id, id))
    .limit(1);

  if (!target) {
    return Response.json({ error: "Resource not found" }, { status: 404 });
  }

  const label = REPORT_KIND_LABEL[reportKind];
  await db.insert(schema.resources).values({
    slug: `report-${target.slug}-${Date.now()}`,
    name: `Report: ${label} — ${target.name}`.slice(0, 80),
    tagline: `Reported “${label.toLowerCase()}” on “${target.name}” (${target.slug}).`,
    description: trimmedNote
      ? `${trimmedNote}\n\n[Reported for resource: ${target.slug}]`
      : `[Reported for resource: ${target.slug}]`,
    url: target.url,
    hasStaticClaimUrl: false,
    categoryId: target.categoryId,
    tags: ["report", reportKind],
    region: target.region,
    costType: target.costType,
    status: "active",
    approved: false,
  });

  revalidatePath("/admin");

  return Response.json({ ok: true });
}
