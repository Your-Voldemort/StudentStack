"use client";

import { ArrowUpRight, CheckCircle2, AlertTriangle, ShieldCheck, CreditCard, Clock, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Resource } from "@/lib/resources";
import { relativeTime } from "@/lib/format";

const VERIFICATION_LABELS: Record<string, string> = {
  none: "No verification required",
  edu_email: ".edu university email",
  github_student_pack: "GitHub Student Developer Pack",
  student_id: "Student ID upload",
};

const DURATION_LABELS: Record<string, string> = {
  one_time: "One-time perk",
  one_year: "1 year access",
  while_student: "Valid while enrolled",
  lifetime: "Lifetime access",
};

const COST_BADGE_STYLE: Record<Resource["costType"], string> = {
  free: "bg-amber-100 text-amber-950 border-amber-300 dark:bg-amber-950/80 dark:text-amber-200 dark:border-amber-700/60 font-semibold",
  discount: "bg-secondary text-secondary-foreground border-border/80",
  credits: "bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-950/70 dark:text-purple-200 dark:border-purple-800",
  trial: "bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950/70 dark:text-blue-200 dark:border-blue-800",
  stipend: "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-200 dark:border-emerald-800",
  scholarship: "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-200 dark:border-emerald-800",
};

export function ResourceDetailDialog({
  resource,
  open,
  onOpenChange,
  onTagClick,
}: {
  resource: Resource;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTagClick?: (tag: string) => void;
}) {
  const verifiedStr = relativeTime(resource.lastVerifiedAt);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader className="gap-1.5 pb-2 text-left">
          <div className="flex items-center gap-2">
            <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs capitalize ${COST_BADGE_STYLE[resource.costType]}`}>
              {resource.costType}
            </span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Globe className="size-3" />
              {resource.region === "IN" ? "India only" : "Global"}
            </span>
            {verifiedStr && (
              <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-mono">
                <CheckCircle2 className="size-3" />
                {verifiedStr}
              </span>
            )}
          </div>
          <DialogTitle className="text-xl font-bold">{resource.name}</DialogTitle>
          {resource.tagline && (
            <p className="text-sm font-medium text-foreground/80">{resource.tagline}</p>
          )}
        </DialogHeader>

        <div className="flex flex-col gap-4 text-sm text-foreground/90">
          <DialogDescription className="text-sm text-foreground whitespace-pre-line leading-relaxed">
            {resource.description}
          </DialogDescription>

          {/* Eligibility & verification metadata */}
          <div className="rounded-lg border bg-muted/40 p-3.5 flex flex-col gap-2.5 text-xs">
            <div className="font-semibold text-foreground/90 uppercase tracking-wider text-[11px]">
              Eligibility & terms
            </div>
            {resource.verificationNeeded && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <ShieldCheck className="size-3.5 text-primary shrink-0" />
                <span>Verification: <strong className="text-foreground">{VERIFICATION_LABELS[resource.verificationNeeded] ?? resource.verificationNeeded}</strong></span>
              </div>
            )}
            {resource.creditCardRequired !== null && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <CreditCard className="size-3.5 text-primary shrink-0" />
                <span>Credit card: <strong className="text-foreground">{resource.creditCardRequired ? "Required" : "Not required"}</strong></span>
              </div>
            )}
            {resource.duration && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="size-3.5 text-primary shrink-0" />
                <span>Duration: <strong className="text-foreground">{DURATION_LABELS[resource.duration] ?? resource.duration}</strong></span>
              </div>
            )}
            {resource.status === "broken" && (
              <div className="flex items-center gap-2 text-destructive font-medium">
                <AlertTriangle className="size-3.5 shrink-0" />
                <span>Link was flagged as potentially broken during recent automated health check.</span>
              </div>
            )}
          </div>

          {/* Tags */}
          {resource.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {resource.tags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => {
                    onOpenChange(false);
                    onTagClick?.(tag);
                  }}
                  className="rounded-full border bg-secondary/50 px-2.5 py-0.5 text-xs text-secondary-foreground hover:bg-secondary transition-colors"
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}

          {/* Action button */}
          <div className="pt-2 flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            {resource.hasStaticClaimUrl && resource.url ? (
              <Button asChild className="gap-1.5 font-semibold">
                <a href={resource.url} target="_blank" rel="noopener noreferrer">
                  Claim Offer
                  <ArrowUpRight className="size-4" />
                </a>
              </Button>
            ) : (
              <div className="rounded border px-3 py-1.5 text-xs text-muted-foreground bg-muted/30 self-center">
                Varies by university or regional portal
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
