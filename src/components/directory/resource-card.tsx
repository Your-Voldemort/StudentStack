"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Resource } from "@/lib/resources";
import { relativeTime } from "@/lib/format";
import { GraduationCap, CheckCircle2, ArrowUpRight, Bookmark, Link as LinkIcon, Check } from "lucide-react";
import styles from "./directory.module.css";

const COST_LABEL: Record<Resource["costType"], string> = {
  free: "Free",
  discount: "Discount",
  stipend: "Stipend",
  scholarship: "Scholarship",
  credits: "Credits",
  trial: "Trial",
};

function faviconUrl(claimUrl: string | null): string | null {
  if (!claimUrl) return null;
  try {
    const host = new URL(claimUrl).hostname;
    return `https://www.google.com/s2/favicons?domain=${host}&sz=64`;
  } catch {
    return null;
  }
}

function ResourceIcon({ resource }: { resource: Resource }) {
  const [failed, setFailed] = useState(false);
  const src = faviconUrl(resource.url);
  if (!src || failed) {
    return <span>{resource.name.slice(0, 1).toUpperCase()}</span>;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- external favicon
    <img src={src} alt="" width={38} height={38} onError={() => setFailed(true)} />
  );
}

function costClass(cost: Resource["costType"]): string {
  if (cost === "free") return styles.costFree;
  if (cost === "credits") return styles.costCredits;
  if (cost === "discount") return styles.costDiscount;
  return styles.costOther;
}

function catClass(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("develop") || n.includes("media") || n.includes("cloud") || n.includes("host")) return styles.catBlue;
  if (n.includes("design") || n.includes("health") || n.includes("well")) return styles.catMint;
  return styles.catLav;
}

function verificationText(r: Resource): string {
  if (r.verificationNeeded === "edu_email") return "Education eligibility required";
  if (r.verificationNeeded === "github_student_pack") return "Student verification required";
  if (r.verificationNeeded === "student_id") return "Student verification required";
  if (r.verificationNeeded === "none") return "Check offer eligibility";
  return "Check offer eligibility";
}

function getResourceShareUrl(resource: Resource): string {
  const query = encodeURIComponent(resource.name);
  const origin = typeof window !== "undefined" && window.location?.origin ? window.location.origin : "";
  return `${origin}/directory?q=${query}`;
}

export function ResourceCard({
  resource,
  onTagClick,
}: {
  resource: Resource;
  onTagClick: (tag: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const verified = relativeTime(resource.lastVerifiedAt);
  const title = resource.tagline || resource.name;

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => {
      setCopied(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const handleCopyLink = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    const shareUrl = getResourceShareUrl(resource);
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else if (typeof document !== "undefined") {
        const textarea = document.createElement("textarea");
        textarea.value = shareUrl;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopied(true);
    } catch {
      // Fallback if clipboard writing fails
    }
  };

  return (
    <article className={styles.card} data-resource-card tabIndex={0}>
      <div className={styles.cardTop}>
        <span className={styles.logo}>
          <ResourceIcon resource={resource} />
        </span>
        <div className={styles.cardHeaderInfo}>
          <p className={styles.cardName}>{resource.name}</p>
          <span className={`${styles.costPill} ${costClass(resource.costType)}`}>
            {COST_LABEL[resource.costType]}
          </span>
        </div>
        <div className={styles.cardActions}>
          <button
            type="button"
            className={`${styles.copyLinkBtn} ${copied ? styles.copyLinkBtnCopied : ""}`}
            onClick={handleCopyLink}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.stopPropagation();
              }
            }}
            aria-label={copied ? `Link copied for ${resource.name}` : `Copy link for ${resource.name}`}
            title={copied ? "Link copied!" : "Copy link"}
          >
            {copied ? (
              <Check className="size-4" aria-hidden="true" />
            ) : (
              <LinkIcon className="size-4" aria-hidden="true" />
            )}
          </button>
          {copied && (
            <span role="status" aria-live="polite" className={styles.copiedToast}>
              Link copied!
            </span>
          )}
          <button type="button" className={styles.bookmark} aria-label={`Save ${resource.name}`}>
            <Bookmark className="size-4" />
          </button>
        </div>
      </div>

      <h3 className={styles.offerTitle}>{title}</h3>

      <Dialog>
        <DialogTrigger asChild>
          <button type="button" style={{ textAlign: "left", background: "none", border: 0, padding: 0, cursor: "pointer" }}>
            <p className={styles.offerDesc}>{resource.description}</p>
          </button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{resource.name}</DialogTitle>
            <DialogDescription className="whitespace-pre-line">{resource.description}</DialogDescription>
          </DialogHeader>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
            {resource.tags.map((t) => (
              <button key={t} type="button" onClick={() => onTagClick(t)} style={{ textDecoration: "underline" }}>{t}</button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <span className={`${styles.catPill} ${catClass(resource.categoryName)}`}>
        {resource.categoryName}
      </span>

      <p className={styles.verifyRow}>
        <GraduationCap className={styles.verifyIcon} aria-hidden />
        <span>{verificationText(resource)}</span>
      </p>

      <div className={styles.cardFoot}>
        <span className={styles.verified}>
          <CheckCircle2 className="size-3.5" aria-hidden />
          <span>{verified ? "Verified" : "Verified"}</span>
        </span>
        {resource.hasStaticClaimUrl && resource.url ? (
          <a href={resource.url} target="_blank" rel="noopener noreferrer" className={styles.viewOffer}>
            <span>View offer</span>
            <ArrowUpRight className="size-3.5" aria-hidden />
          </a>
        ) : (
          <span className={styles.viewOffer} title="Varies by region">
            <span>View offer</span>
            <ArrowUpRight className="size-3.5" aria-hidden />
          </span>
        )}
      </div>
    </article>
  );
}
