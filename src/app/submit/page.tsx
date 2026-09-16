import type { Metadata } from "next";
import styles from "@/components/home/brand.module.css";
import { SiteFooter, SiteHeader } from "@/components/home/site-chrome";
import { passFontVariables } from "@/lib/fonts";
import { getCategories, getSubmissionsByUser, type UserSubmission } from "@/lib/resources";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { signOut } from "./actions";
import { SignInPanel } from "./sign-in-panel";
import { SubmitForm } from "./submit-form";

export const metadata: Metadata = {
  title: "Add a perk | StudentStack",
  description: "Found a student offer that isn’t on StudentStack? Send it in. Every submission is checked before it goes live.",
};

const SIGN_IN_ERRORS: Record<string, string> = {
  link: "That sign-in link didn’t work. Links expire after an hour and only open in the browser that asked for them. Request a new one below.",
  google: "Google sign-in didn’t start. Try again, or get a link by email instead.",
};

const submittedDate = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });

function submissionStatus(submission: UserSubmission): { label: string; live: boolean } {
  if (!submission.approved) return { label: "Waiting for review", live: false };
  if (submission.status === "active") return { label: "Live", live: true };
  return { label: "No longer available", live: false };
}

export default async function SubmitPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [categories, submissions] = user
    ? await Promise.all([getCategories(), getSubmissionsByUser(user.id)])
    : [[], []];
  const signInError = !user && error ? SIGN_IN_ERRORS[error] : undefined;

  return (
    <div className={`${passFontVariables} ${styles.root}`}>
      <SiteHeader />

      <main className={`${styles.wrap} ${styles.formPage}`}>
        <div>
          <h1 className={styles.pageTitle}>Add a perk</h1>
          <p className={styles.lede}>
            Found a student offer that isn’t listed? Send it in. Every submission is checked by hand before it goes
            live.
          </p>
          <p className={styles.checklistTitle}>What gets an offer approved quickly</p>
          <ul className={styles.checklist}>
            <li>The official page where students claim it, not an article about it.</li>
            <li>What students actually get, with numbers where there are any.</li>
            <li>What’s needed to qualify: a student email, the GitHub Student Pack, an ID upload, or nothing.</li>
          </ul>
        </div>

        <div className={styles.formPanel}>
          {signInError && (
            <p role="alert" className={styles.formError}>
              {signInError}
            </p>
          )}
          {user ? (
            <>
              <div className={styles.signedIn}>
                <span>
                  Signed in as <strong>{user.email}</strong>
                </span>
                <form action={signOut}>
                  <button type="submit" className={styles.linkButton}>
                    Sign out
                  </button>
                </form>
              </div>
              <SubmitForm categories={categories} />
            </>
          ) : (
            <SignInPanel />
          )}
        </div>
      </main>

      {user && submissions.length > 0 && (
        <section className={styles.section} aria-labelledby="your-submissions">
          <div className={`${styles.wrap} ${styles.split}`}>
            <div>
              <h2 id="your-submissions" className={styles.sectionTitle}>
                Your submissions
              </h2>
              <p className={styles.sectionLede}>Offers that aren’t approved are removed from this list.</p>
            </div>
            <ul className={styles.submissions}>
              {submissions.map((submission) => {
                const status = submissionStatus(submission);
                return (
                  <li key={submission.id} className={styles.submissionRow}>
                    <span className={styles.offerName}>{submission.name}</span>
                    <span className={styles.submissionMeta}>
                      <span className={styles.submissionDate}>{submittedDate.format(submission.createdAt)}</span>
                      <span className={`${styles.status} ${status.live ? styles.statusLive : ""}`}>{status.label}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      )}

      <SiteFooter />
    </div>
  );
}
