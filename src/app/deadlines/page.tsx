import type { Metadata } from "next";
import { SiteHeader } from "@/components/home/site-chrome";
import { passFontVariables } from "@/lib/fonts";
import { getResourcesWithDeadlines } from "@/lib/resources";
import { partitionDeadlines } from "@/lib/deadlines";
import { DeadlinesList } from "./deadlines-list";
import dirStyles from "@/components/directory/directory.module.css";
import homeStyles from "@/components/home/brand.module.css";
import styles from "./deadlines.module.css";

export const metadata: Metadata = {
  title: "Deadlines — StudentStack",
  description:
    "Scholarships, internships, and limited-time student offers with application deadlines, soonest first.",
};

// Deadlines change when admins edit resources; without this, Next statically
// prerenders the page at build time and it would go stale. Same treatment as
// /directory.
export const dynamic = "force-dynamic";

export default async function DeadlinesPage() {
  const resources = await getResourcesWithDeadlines();
  const { closingSoon, upcoming, past } = partitionDeadlines(resources);

  return (
    <div className={`${passFontVariables} ${homeStyles.root}`}>
      <SiteHeader />
      <div className={dirStyles.root}>
        <main className={dirStyles.wrap}>
          <section className={dirStyles.hero}>
            <p className={dirStyles.eyebrow}>
              <span className={dirStyles.eyebrowDot} aria-hidden />
              Never miss a cutoff
            </p>
            <h1 className={dirStyles.headline}>
              Deadlines, <span className={dirStyles.headlineAccent}>soonest first.</span>
            </h1>
            <p className={dirStyles.subcopy}>
              Scholarships, internships, and limited-time student offers with application deadlines.
            </p>
            <div className={styles.feedCtas}>
              <a className={styles.feedBtn} href="/deadlines.ics" download>
                Subscribe to Calendar (.ics)
              </a>
              <a className={styles.feedBtn} href="/deadlines.rss">
                RSS Feed (.rss)
              </a>
            </div>
          </section>
          <DeadlinesList closingSoon={closingSoon} upcoming={upcoming} past={past} />
        </main>
      </div>
    </div>
  );
}
