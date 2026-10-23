import { NextResponse, type NextRequest } from "next/server";
import { getViewerReviewState } from "@/lib/reviews";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// GET /api/reviews/votes?resourceId= — which of a resource's reviews the
// signed-in student marked helpful, and which one is their own (issue
// #119). Only the viewer's own review id is returned, never other authors'.
export async function GET(request: NextRequest) {
  const headers = { "Cache-Control": "private, no-store" };
  const signedOut = { signedIn: false, voted: [], mine: null };
  const resourceId = Number(request.nextUrl.searchParams.get("resourceId"));
  if (!Number.isInteger(resourceId) || resourceId <= 0) {
    return NextResponse.json({ error: "resourceId is required" }, { status: 400, headers });
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return NextResponse.json(signedOut, { headers });

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json(signedOut, { headers });

  try {
    return NextResponse.json({ signedIn: true, ...(await getViewerReviewState(user.id, resourceId)) }, { headers });
  } catch (error) {
    console.warn("[reviews] votes failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ signedIn: true, voted: [], mine: null }, { headers });
  }
}
