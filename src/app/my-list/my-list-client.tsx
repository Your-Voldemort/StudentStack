"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Bookmark, CheckCircle2, XCircle, ArrowUpRight, Calendar, AlertCircle } from "lucide-react";
import styles from "./my-list.module.css";

const STATUS_LABEL: Record<string, string> = {
  interested: "Interested",
  applied: "Applied",
  got_it: "Got it",
  rejected: "Rejected",
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  interested: <Bookmark className="size-4" />,
  applied: <AlertCircle className="size-4" />,
  got_it: <CheckCircle2 className="size-4" />,
  rejected: <XCircle className="size-4" />,
};

const STATUS_COLOR: Record<string, string> = {
  interested: styles.statusInterested,
  applied: styles.statusApplied,
  got_it: styles.statusGotIt,
  rejected: styles.statusRejected,
};

type BookmarkItem = {
  id: number;
  slug: string;
  name: string;
  tagline: string | null;
  description: string;
  url: string | null;
  hasStaticClaimUrl: boolean;
  categoryId: number;
  tags: string[];
  region: string;
  costType: string;
  verificationNeeded: string | null;
  creditCardRequired: boolean | null;
  duration: string | null;
  status: string;
  lastVerifiedAt: number | null;
  deadline: number | null;
  categorySlug: string;
  categoryName: string;
  categoryIcon: string;
  bookmarkStatus: string;
  bookmarkCreatedAt: string;
};

export function MyListClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBookmarks();
  }, []);

  const fetchBookmarks = async () => {
    try {
      const res = await fetch("/api/bookmarks");
      if (!res.ok) {
        if (res.status === 401) {
          router.push("/admin/login?redirect=/my-list");
          return;
        }
        throw new Error("Failed to fetch bookmarks");
      }
      const data = await res.json();
      setBookmarks(data.bookmarks || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load bookmarks");
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (resourceId: number, newStatus: string) => {
    try {
      const res = await fetch("/api/bookmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resourceId, status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      setBookmarks((prev) =>
        prev.map((b) => (b.id === resourceId ? { ...b, bookmarkStatus: newStatus } : b))
      );
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  const removeBookmark = async (resourceId: number) => {
    try {
      const res = await fetch(`/api/bookmarks?resourceId=${resourceId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to remove bookmark");
      setBookmarks((prev) => prev.filter((b) => b.id !== resourceId));
    } catch (err) {
      console.error("Failed to remove bookmark:", err);
    }
  };

  const deadlineLabel = (ts: number | null): { label: string; urgent: boolean } => {
    if (!ts) return { label: "No deadline", urgent: false };
    const now = Date.now();
    const diffDays = Math.ceil((ts - now) / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return { label: "Deadline passed", urgent: true };
    if (diffDays <= 7) return { label: `${diffDays} day${diffDays === 1 ? "" : "s"} left`, urgent: true };
    if (diffDays <= 30) return { label: `${diffDays} days left`, urgent: false };
    const date = new Date(ts);
    return { label: date.toLocaleDateString("en-GB", { month: "short", day: "numeric", year: "numeric" }), urgent: false };
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.skeleton} />
        <div className={styles.skeleton} />
        <div className={styles.skeleton} />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.error}>
        <AlertCircle className={styles.errorIcon} />
        <p>{error}</p>
      </div>
    );
  }

  if (bookmarks.length === 0) {
    return (
      <div className={styles.empty}>
        <Bookmark className={styles.emptyIcon} />
        <p>No saved items yet.</p>
        <p className={styles.emptyHint}>Browse the <a href="/directory">directory</a> and click the bookmark icon to save opportunities.</p>
      </div>
    );
  }

  return (
    <ul className={styles.list} role="list">
      {bookmarks.map((item) => {
        const { label, urgent } = deadlineLabel(item.deadline);
        const status = item.bookmarkStatus;
        return (
          <li key={item.id} className={styles.item}>
            <article className={styles.card}>
              <div className={styles.cardMain}>
                <div className={styles.info}>
                  <div className={styles.nameRow}>
                    <h2 className={styles.name}>{item.name}</h2>
                    <div className={styles.actions}>
                      <select
                        value={status}
                        onChange={(e) => updateStatus(item.id, e.target.value)}
                        className={`${styles.statusSelect} ${STATUS_COLOR[status]}`}
                        aria-label={`Change status for ${item.name}`}
                      >
                        <option value="interested">Interested</option>
                        <option value="applied">Applied</option>
                        <option value="got_it">Got it</option>
                        <option value="rejected">Rejected</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => removeBookmark(item.id)}
                        className={styles.removeBtn}
                        aria-label={`Remove ${item.name} from list`}
                      >
                        <XCircle className="size-4" />
                      </button>
                    </div>
                  </div>
                  <p className={styles.tagline}>{item.tagline || item.description.slice(0, 120)}</p>
                  <div className={styles.meta}>
                    <span className={`${styles.costPill} ${styles[`cost${item.costType.charAt(0).toUpperCase() + item.costType.slice(1)}`]}`}>
                      {item.costType}
                    </span>
                    <span className={styles.category}>{item.categoryName}</span>
                  </div>
                </div>
                <div className={styles.cardSide}>
                  <div className={`${styles.deadline} ${urgent ? styles.deadlineUrgent : ""}`}>
                    <Calendar className={styles.deadlineIcon} />
                    <span>{label}</span>
                  </div>
                  {item.hasStaticClaimUrl && item.url && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.applyLink}
                    >
                      <span>View offer</span>
                      <ArrowUpRight className="size-3.5" />
                    </a>
                  )}
                </div>
              </div>
            </article>
          </li>
        );
      })}
    </ul>
  );
}