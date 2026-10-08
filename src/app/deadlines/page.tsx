import { Metadata } from "next";
import Link from "next/link";
import { SiteHeader, SiteFooter } from "@/components/home/site-chrome";
import { passFontVariables } from "@/lib/fonts";
import { getResourcesWithDeadlines } from "@/lib/resources";
import { Calendar, ArrowUpRight, ExternalLink } from "lucide-react";
import styles from "./deadlines.module.css";

export const metadata: Metadata = {
  title: "Upcoming Deadlines | StudentStack",
  description: "Track scholarship, internship, and program deadlines. Never miss an application window.",
};

function deadlineLabel(ts: number): { label: string; urgent: boolean } {
  const now = Date.now();
  const diffDays = Math.ceil((ts - now) / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return { label: "Deadline passed", urgent: true };
  if (diffDays <= 7) return { label: `${diffDays} day${diffDays === 1 ? "" : "s"} left`, urgent: true };
  if (diffDays <= 30) return { label: `${diffDays} days left`, urgent: false };
  const date = new Date(ts);
  return { label: date.toLocaleDateString("en-GB", { month: "short", day: "numeric", year: "numeric" }), urgent: false };
}

export default async function DeadlinesPage() {
  const resources = await getResourcesWithDeadlines();

  return (
    <div className={`${passFontVariables} ${styles.root}`}>
      <SiteHeader />
      <main className={styles.wrap}>
        <header className={styles.header}>
          <h1 className={styles.title}>Upcoming deadlines</h1>
          <p className={styles.subtitle}>
            Scholarships, internships, and programs with application windows closing soon.
          </p>
        </header>

        {resources.length === 0 ? (
          <div className={styles.empty}>
            <Calendar className={styles.emptyIcon} aria-hidden />
            <p>No upcoming deadlines at the moment.</p>
            <p className={styles.emptyHint}>Check back later — new opportunities are added regularly.</p>
          </div>
        ) : (
          <ul className={styles.list} role="list">
            {resources.map((resource) => {
              const { label, urgent } = deadlineLabel(resource.deadline!);
              return (
                <li key={resource.id} className={styles.item}>
                  <article className={styles.card}>
                    <div className={styles.cardMain}>
                      <div className={styles.info}>
                        <h2 className={styles.name}>{resource.name}</h2>
                        <p className={styles.tagline}>{resource.tagline || resource.description.slice(0, 120)}</p>
                        <div className={styles.meta}>
                          <span className={`${styles.costPill} ${styles[`cost${resource.costType.charAt(0).toUpperCase() + resource.costType.slice(1)}`]}`}>
                            {resource.costType}
                          </span>
                          <span className={styles.category}>{resource.categoryName}</span>
                        </div>
                      </div>
                      <div className={styles.deadlineWrapper}>
                        <div className={`${styles.deadline} ${urgent ? styles.deadlineUrgent : ""}`}>
                          <Calendar className={styles.deadlineIcon} aria-hidden />
                          <span>{label}</span>
                        </div>
                        {resource.hasStaticClaimUrl && resource.url && (
                          <a
                            href={resource.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.applyLink}
                          >
                            <span>Apply now</span>
                            <ArrowUpRight className="size-4" aria-hidden />
                          </a>
                        )}
                      </div>
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}