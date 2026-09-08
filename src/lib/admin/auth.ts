import "server-only";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// Single-admin gate for Phase 2 (PRD §8.5) — full multi-user accounts land
// in Phase 3. Authorization is "is this the one allow-listed email",
// checked here AND independently inside every admin Server Action, per
// Next.js's guidance that a layout/proxy check alone is not sufficient.
export async function verifyAdmin(): Promise<{ email: string }> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email || user.email !== process.env.ADMIN_EMAIL) {
    redirect("/admin/login");
  }

  return { email: user.email };
}
