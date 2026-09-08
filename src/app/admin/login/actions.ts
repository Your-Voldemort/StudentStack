"use server";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/admin/login?error=${encodeURIComponent("Invalid email or password")}`);
  }
  if (email !== process.env.ADMIN_EMAIL) {
    await supabase.auth.signOut();
    redirect(`/admin/login?error=${encodeURIComponent("Not an admin account")}`);
  }

  redirect("/admin");
}
