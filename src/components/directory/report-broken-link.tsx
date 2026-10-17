"use client";

import { useState } from "react";
import { Flag } from "lucide-react";
import type { Resource } from "@/lib/resources";
import type { ReportKind } from "@/app/api/reports/route";

const REPORT_OPTIONS: { value: ReportKind; label: string }[] = [
  { value: "dead-link", label: "Dead link" },
  { value: "offer-expired", label: "Offer expired" },
  { value: "wrong-info", label: "Wrong info" },
];

// Issue #76: "Report: dead / expired / wrong" action for resource cards and
// the detail dialog. Submits to POST /api/reports, which writes an
// unapproved "report"-tagged row into the existing submissions pipeline so
// admins see it in the /admin review queue.
export function ReportBrokenLink({
  resource,
  className,
  textButton = false,
}: {
  resource: Resource;
  className?: string;
  textButton?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<ReportKind>("dead-link");
  const [note, setNote] = useState("");
  const [state, setState] = useState<"idle" | "submitting" | "done" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (state === "submitting" || state === "done") return;
    setState("submitting");
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resourceId: resource.id, kind, note }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setState("done");
    } catch {
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <span
        role="status"
        aria-live="polite"
        className="text-xs font-medium text-emerald-600 dark:text-emerald-400"
      >
        Thanks — reported for review.
      </span>
    );
  }

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      {textButton ? (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={`Report a problem with ${resource.name}`}
          className={`text-xs text-muted-foreground underline-offset-4 hover:underline ${className ?? ""}`}
        >
          Report issue
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.stopPropagation();
            }
          }}
          aria-expanded={open}
          aria-label={`Report a problem with ${resource.name}`}
          title="Report a problem"
          className={className}
        >
          <Flag className="size-4" aria-hidden="true" />
        </button>
      )}

      {open && (
        <form
          onSubmit={handleSubmit}
          className="absolute right-0 bottom-[calc(100%+8px)] z-30 w-64 rounded-lg border border-border bg-background p-3 shadow-xl"
          aria-label={`Report a problem with ${resource.name}`}
        >
          <p className="text-xs font-semibold text-foreground">Report an issue</p>
          <div className="mt-2 flex flex-col gap-1.5" role="radiogroup" aria-label="Issue type">
            {REPORT_OPTIONS.map((option) => (
              <label
                key={option.value}
                className="flex cursor-pointer items-center gap-2 text-xs text-foreground"
              >
                <input
                  type="radio"
                  name="report-kind"
                  value={option.value}
                  checked={kind === option.value}
                  onChange={() => setKind(option.value)}
                  className="accent-current"
                />
                {option.label}
              </label>
            ))}
          </div>
          <label className="mt-2 block">
            <span className="sr-only">Optional note</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
              rows={2}
              placeholder="Optional note (what's wrong?)"
              className="mt-1 w-full rounded-md border border-border bg-background p-1.5 text-xs text-foreground placeholder:text-muted-foreground"
            />
          </label>
          {state === "error" && (
            <p role="alert" className="mt-1.5 text-xs text-destructive">
              Couldn&apos;t submit the report. Please try again.
            </p>
          )}
          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={state === "submitting"}
              className="rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground disabled:opacity-60"
            >
              {state === "submitting" ? "Sending…" : "Submit report"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
