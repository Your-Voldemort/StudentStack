import { eq, and } from "drizzle-orm";
import { db, schema } from "@/db";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bookmarks = await db
    .select({
      id: schema.resources.id,
      slug: schema.resources.slug,
      name: schema.resources.name,
      tagline: schema.resources.tagline,
      description: schema.resources.description,
      url: schema.resources.url,
      hasStaticClaimUrl: schema.resources.hasStaticClaimUrl,
      categoryId: schema.resources.categoryId,
      tags: schema.resources.tags,
      region: schema.resources.region,
      costType: schema.resources.costType,
      verificationNeeded: schema.resources.verificationNeeded,
      creditCardRequired: schema.resources.creditCardRequired,
      duration: schema.resources.duration,
      status: schema.resources.status,
      lastVerifiedAt: schema.resources.lastVerifiedAt,
      deadline: schema.resources.deadline,
      categorySlug: schema.categories.slug,
      categoryName: schema.categories.name,
      categoryIcon: schema.categories.icon,
      bookmarkStatus: schema.bookmarks.status,
      bookmarkCreatedAt: schema.bookmarks.createdAt,
    })
    .from(schema.bookmarks)
    .innerJoin(schema.resources, eq(schema.bookmarks.resourceId, schema.resources.id))
    .innerJoin(schema.categories, eq(schema.resources.categoryId, schema.categories.id))
    .where(and(eq(schema.bookmarks.userId, user.id), eq(schema.resources.approved, true)))
    .orderBy(schema.bookmarks.createdAt);

  return NextResponse.json({ bookmarks });
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { resourceId, status = "interested" } = body;

  if (!resourceId || !Number.isInteger(resourceId)) {
    return NextResponse.json({ error: "Invalid resourceId" }, { status: 400 });
  }

  const validStatuses = ["interested", "applied", "got_it", "rejected"] as const;
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const [existing] = await db
    .select()
    .from(schema.bookmarks)
    .where(and(eq(schema.bookmarks.userId, user.id), eq(schema.bookmarks.resourceId, resourceId)))
    .limit(1);

  if (existing) {
    await db
      .update(schema.bookmarks)
      .set({ status })
      .where(and(eq(schema.bookmarks.userId, user.id), eq(schema.bookmarks.resourceId, resourceId)));
    return NextResponse.json({ ok: true, updated: true });
  }

  await db.insert(schema.bookmarks).values({
    userId: user.id,
    resourceId,
    status,
  });

  return NextResponse.json({ ok: true, created: true });
}

export async function DELETE(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const resourceId = Number(searchParams.get("resourceId"));

  if (!resourceId || !Number.isInteger(resourceId)) {
    return NextResponse.json({ error: "Invalid resourceId" }, { status: 400 });
  }

  await db
    .delete(schema.bookmarks)
    .where(and(eq(schema.bookmarks.userId, user.id), eq(schema.bookmarks.resourceId, resourceId)));

  return NextResponse.json({ ok: true });
}