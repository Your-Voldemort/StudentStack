"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db, schema } from "@/db";
import { countPendingByUser, getCategories, isUrlListed } from "@/lib/resources";
import { slugify, validateSubmission, type SubmissionErrors } from "@/lib/submissions";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const MAX_PENDING_PER_STUDENT = 5;
const SUBMISSION_FIELDS = ["name", "url", "tagline", "description", "categoryId", "costType", "region"] as const;

// Supabase only redirects to URLs on the project's allow list, so building the
// callback from the request's own origin can't send anyone off-site.
async function callbackUrl(): Promise<string> {
  const h = await headers();
  const origin =
    h.get("origin") ?? `${h.get("x-forwarded-proto") ?? "https"}://${h.get("x-forwarded-host") ?? h.get("host")}`;
  return `${origin}/auth/callback?next=/submit`;
}

export type EmailSignInState = { status: "idle" | "sent" | "error"; message?: string; email?: string };

export async function signInWithEmail(_prev: EmailSignInState, formData: FormData): Promise<EmailSignInState> {
  const email = String(formData.get("email") ?? "").trim();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { status: "error", message: "Enter the email address you want the sign-in link sent to.", email };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: await callbackUrl() },
  });

  if (error) {
    const message =
      error.status === 429
        ? "A link was sent to this address a moment ago. Wait a minute, then try again."
        : "We couldn’t send the link. Check the address and try again.";
    return { status: "error", message, email };
  }
  return { status: "sent", email };
}

export async function signInWithGoogle() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: await callbackUrl() },
  });
  if (error || !data.url) redirect("/submit?error=google");
  redirect(data.url);
}

export async function signOut() {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect("/submit");
}

export type SubmitState = {
  status: "idle" | "error" | "success";
  message?: string;
  errors?: SubmissionErrors;
  values?: Record<string, string>;
  submittedName?: string;
};

export async function submitResource(_prev: SubmitState, formData: FormData): Promise<SubmitState> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Your sign-in expired. Reload the page and sign in again." };

  const values = Object.fromEntries(SUBMISSION_FIELDS.map((field) => [field, String(formData.get(field) ?? "")]));
  const categories = await getCategories();
  const result = validateSubmission(
    values,
    categories.map((c) => c.id),
  );
  if (!result.ok) return { status: "error", message: "A few fields need a fix.", errors: result.errors, values };

  if ((await countPendingByUser(user.id)) >= MAX_PENDING_PER_STUDENT) {
    return {
      status: "error",
      message: `You already have ${MAX_PENDING_PER_STUDENT} offers waiting for review. You can add more once those are checked.`,
      values,
    };
  }

  // ponytail: check-then-insert, so two simultaneous sends of the same link can
  // both land. Admin review catches that; add a unique index on the normalized
  // URL if duplicates show up in the queue.
  if (await isUrlListed(result.value.url)) {
    return {
      status: "error",
      message: "A few fields need a fix.",
      errors: { url: "That link is already in the directory or waiting for review." },
      values,
    };
  }

  const offer = result.value;
  await db.insert(schema.resources).values({
    slug: `${slugify(offer.name)}-${crypto.randomUUID().slice(0, 6)}`,
    name: offer.name,
    tagline: offer.tagline,
    description: offer.description,
    url: offer.url,
    hasStaticClaimUrl: true,
    categoryId: offer.categoryId,
    region: offer.region,
    costType: offer.costType,
    status: "active",
    approved: false,
    submittedBy: user.id,
  });

  revalidatePath("/admin");
  revalidatePath("/submit");
  return { status: "success", submittedName: offer.name };
}
