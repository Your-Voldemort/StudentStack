"use client";

import { useState } from "react";
import { ArrowUpRight, CheckCircle2, AlertTriangle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Resource } from "@/lib/resources";
import { relativeTime } from "@/lib/format";
import { ResourceDetailDialog } from "./resource-detail-dialog";

const COST_BADGE_STYLE: Record<Resource["costType"], string> = {
  free: "bg-amber-100 text-amber-950 border-amber-300 dark:bg-amber-950/80 dark:text-amber-200 dark:border-amber-700/60 font-semibold",
  discount: "bg-secondary text-secondary-foreground border-border/80",
  credits: "bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-950/70 dark:text-purple-200 dark:border-purple-800",
  trial: "bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950/70 dark:text-blue-200 dark:border-blue-800",
  stipend: "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-200 dark:border-emerald-800",
  scholarship: "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-200 dark:border-emerald-800",
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

export function ResourceIcon({ resource, size = "md" }: { resource: Resource; size?: "sm" | "md" }) {
  const [failed, setFailed] = useState(false);
  const src = faviconUrl(resource.url);
  const dim = size === "sm" ? 22 : 28;
  const boxClass = size === "sm" ? "size-[22px] text-[11px]" : "size-7 text-xs";

  if (!src || failed) {
    const letter = resource.name.trim()[0]?.toUpperCase() ?? "?";
    return (
      <span
        className={`inline-flex ${boxClass} shrink-0 items-center justify-center rounded-md font-bold bg-secondary text-foreground border border-border/70 select-none`}
        aria-hidden
      >
        {letter}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- external favicon, not an optimizable local asset
    <img
      src={src}
      alt=""
      width={dim}
      height={dim}
      className={`${size === "sm" ? "size-[22px]" : "size-7"} shrink-0 rounded object-contain`}
      onError={() => setFailed(true)}
    />
  );
}

export function ResourceRow({
  resource,
  onTagClick,
}: {
  resource: Resource;
  onTagClick: (tag: string) => void;
}) {
  const [detailOpen, setDetailOpen] = useState(false);
  const verifiedStr = relativeTime(resource.lastVerifiedAt);

  // Use tagline as the offer headline; fallback to first sentence or slice of description
  const offerHeadline = resource.tagline || resource.description.split("\n")[0] || resource.name;

  return (
    <>
      <div className="group relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border bg-card p-3.5 sm:px-4 sm:py-3 transition-colors hover:border-foreground/30 hover:bg-muted/30">
        {/* Left: Icon, Name, and Headline Offer */}
        <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
          <ResourceIcon resource={resource} size="md" />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setDetailOpen(true)}
                className="font-semibold text-foreground hover:underline text-left truncate text-sm sm:text-base cursor-pointer"
              >
                {resource.name}
              </button>
              <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] capitalize shrink-0 ${COST_BADGE_STYLE[resource.costType]}`}>
                {resource.costType}
              </span>
              {resource.region === "IN" && (
                <span className="text-[11px] font-medium text-amber-700 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                  🇮🇳 India
                </span>
              )}
            </div>

            <p
              onClick={() => setDetailOpen(true)}
              className="text-xs sm:text-sm text-muted-foreground truncate cursor-pointer hover:text-foreground/80 mt-0.5"
            >
              {offerHeadline}
            </p>
          </div>
        </div>

        {/* Right: Verification, Region & Action button */}
        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-border/40">
          <div className="flex items-center gap-2 text-xs">
            {verifiedStr && (
              <span className="text-emerald-700 dark:text-emerald-400 font-mono text-[11px] flex items-center gap-1">
                <CheckCircle2 className="size-3" />
                {verifiedStr}
              </span>
            )}
            {resource.status === "broken" && (
              <span className="text-destructive text-[11px] flex items-center gap-1 font-medium">
                <AlertTriangle className="size-3" />
                Down
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDetailOpen(true)}
              className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground"
            >
              Details
            </Button>

            {resource.hasStaticClaimUrl && resource.url ? (
              <Button asChild size="sm" className="h-8 px-3 text-xs font-semibold gap-1">
                <a
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Claim ${resource.name}`}
                >
                  Claim
                  <ArrowUpRight className="size-3.5" />
                </a>
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDetailOpen(true)}
                className="h-8 px-2.5 text-xs text-muted-foreground gap-1"
                title="Varies by university/portal — click for details"
              >
                <Info className="size-3" />
                Regional
              </Button>
            )}
          </div>
        </div>
      </div>

      <ResourceDetailDialog
        resource={resource}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onTagClick={onTagClick}
      />
    </>
  );
}
