"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ResourceCard } from "@/components/directory/resource-card";
import type { Resource } from "@/lib/resources";
import {
  CLOSING_SOON_DAYS,
  formatDeadline,
  isClosingSoon,
  relativeDeadline,
} from "@/lib/deadlines";
import dirStyles from "@/components/directory/directory.module.css";
import styles from "./deadlines.module.css";

function DeadlineCard({ resource }: { resource: Resource }) {
  const router = useRouter();
  const closingSoon = resource.deadline !== null && isClosingSoon(resource.deadline);

  return (
    <div className={styles.cardWrap}>
      {resource.deadline !== null && (
        <p className={closingSoon ? styles.closingLine : styles.deadlineLine}>
          {closingSoon && <span className={styles.closingBadge}>Closing soon</span>}
          <span>
            Deadline {formatDeadline(resource.deadline)} · {relativeDeadline(resource.deadline)}
          </span>
        </p>
      )}
      <ResourceCard
        resource={resource}
        onTagClick={(tag) => router.push(`/directory?q=${encodeURIComponent(tag)}`)}
      />
    </div>
  );
}

function DeadlineSection({
  id,
  title,
  subcopy,
  resources,
}: {
  id: string;
  title: string;
  subcopy?: string;
  resources: Resource[];
}) {
  if (resources.length === 0) return null;
  return (
    <section aria-labelledby={id} className={styles.section}>
      <h2 id={id} className={styles.sectionTitle}>
        {title} <span className={styles.count}>{resources.length}</span>
      </h2>
      {subcopy && <p className={styles.sectionSub}>{subcopy}</p>}
      <div className={dirStyles.grid}>
        {resources.map((resource) => (
          <DeadlineCard key={resource.id} resource={resource} />
        ))}
      </div>
    </section>
  );
}

export function DeadlinesList({
  closingSoon,
  upcoming,
  past,
}: {
  closingSoon: Resource[];
  upcoming: Resource[];
  past: Resource[];
}) {
  if (closingSoon.length === 0 && upcoming.length === 0 && past.length === 0) {
    return (
      <p className={styles.empty} role="status">
        No deadlines on the books yet. Deadlines show up here once they&rsquo;re added to an
        offer — check the <Link href="/directory">directory</Link> for everything else.
      </p>
    );
  }

  return (
    <div className={styles.sections}>
      <DeadlineSection
        id="closing-soon"
        title="Closing soon"
        subcopy={`These close within the next ${CLOSING_SOON_DAYS} days — apply now if you qualify.`}
        resources={closingSoon}
      />
      <DeadlineSection id="upcoming" title="Upcoming deadlines" resources={upcoming} />
      {past.length > 0 && (
        <details className={styles.pastDetails}>
          <summary className={styles.pastSummary}>
            Past deadlines <span className={styles.count}>{past.length}</span>
          </summary>
          <p className={styles.sectionSub}>
            Kept for reference — many of these run again next cycle.
          </p>
          <div className={dirStyles.grid}>
            {past.map((resource) => (
              <DeadlineCard key={resource.id} resource={resource} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
