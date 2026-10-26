import type { Metadata } from "next";
import Link from "next/link";
import styles from "@/components/home/brand.module.css";
import { SiteFooter, SiteHeader } from "@/components/home/site-chrome";
import { passFontVariables } from "@/lib/fonts";
import { AdminLoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Admin login | StudentStack",
  description: "Sign in to review student submissions, verify offer links, and manage the StudentStack directory.",
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; code?: string; email?: string }>;
}) {
  const { error, code, email } = await searchParams;

  return (
    <div className={`${passFontVariables} ${styles.root}`}>
      <SiteHeader />

      <main className={`${styles.wrap} ${styles.formPage}`}>
        <div>
          <h1 className={styles.pageTitle}>Admin login</h1>
          <p className={styles.lede}>
            Sign in to review student submissions, check broken offer links, and manage the ingestion queue.
          </p>
          <p className={styles.checklistTitle}>What this dashboard controls</p>
          <ul className={styles.checklist}>
            <li>Approve or edit student-submitted perks before they appear in the public directory.</li>
            <li>Triage weekly link-health failures and update active, broken, or expired offer states.</li>
            <li>Review automated ingestion candidates and possible duplicates across sources.</li>
          </ul>
          <p className={`${styles.hint} mt-6`}>
            Looking to submit a student deal instead?{" "}
            <Link href="/submit" className={styles.textLink}>
              Add a perk →
            </Link>
          </p>
        </div>

        <div className={styles.formPanel}>
          <AdminLoginForm error={error} code={code} defaultEmail={email} />
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
