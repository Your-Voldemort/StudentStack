"use server";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/profiles";
import { isAdmin } from "@/lib/admin/roles";

export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    const params = new URLSearchParams({
      error: "Incorrect password — Invalid email or password.",
      code: "invalid_password",
    });
    if (email) params.set("email", email);
    redirect(`/admin/login?${params.toString()}`);
  }

  const profile = data.user ? await getProfile(data.user.id).catch(() => null) : null;
  if (!isAdmin({ email, role: profile?.role })) {
    await supabase.auth.signOut();
    const params = new URLSearchParams({
      error: "Not an admin account — This email does not have admin access.",
      code: "not_admin",
    });
    if (email) params.set("email", email);
    redirect(`/admin/login?${params.toString()}`);
  }

  redirect("/admin");
}
