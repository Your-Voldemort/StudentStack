"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DEFAULT_ELIGIBILITY,
  ELIGIBILITY_LEVEL_OPTIONS,
  parseEligibilityProfile,
  type EligibilityProfile,
} from "@/lib/eligibility";
import { BRANCHES, YEARS } from "@/lib/personalization";
import styles from "./directory.module.css";

const COUNTRIES: [string, string][] = [
  ["IN", "India"],
  ["US", "United States"],
  ["GB", "United Kingdom"],
  ["CA", "Canada"],
  ["AU", "Australia"],
  ["DE", "Germany"],
  ["SG", "Singapore"],
  ["AE", "United Arab Emirates"],
  ["BD", "Bangladesh"],
  ["PK", "Pakistan"],
  ["NP", "Nepal"],
  ["LK", "Sri Lanka"],
];

const fieldClass = "flex flex-col gap-1 text-sm";
const inputClass = "rounded border border-border bg-background px-3 py-2";

// "My eligibility" (issue #84): a skippable form that never needs an
// account. Saved to localStorage by the caller.
export function EligibilitySheet({
  open,
  onOpenChange,
  profile,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: EligibilityProfile | null;
  onSave: (profile: EligibilityProfile | null) => void;
}) {
  if (!open) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`max-h-[90vh] overflow-y-auto ${styles.dialog}`}>
        <DialogHeader>
          <DialogTitle>My eligibility</DialogTitle>
          <DialogDescription>
            Used to show only what you can claim or apply to. Saved in this browser; no account needed. Leave anything
            blank you’d rather not say.
          </DialogDescription>
        </DialogHeader>
        {/* DialogContent unmounts when closed, so the form state resets on every open. */}
        <EligibilityForm profile={profile} onSave={onSave} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function EligibilityForm({
  profile,
  onSave,
  onDone,
}: {
  profile: EligibilityProfile | null;
  onSave: (profile: EligibilityProfile | null) => void;
  onDone: () => void;
}) {
  const current = profile ?? DEFAULT_ELIGIBILITY;
  const [country, setCountry] = useState(current.country);

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const year = Number(fd.get("year"));
        const next = parseEligibilityProfile({
          country: fd.get("country"),
          state: fd.get("state") || undefined,
          level: fd.get("level") || undefined,
          year: year || undefined,
          field: fd.get("field") || undefined,
          hasEduEmail: fd.get("hasEduEmail") === "on",
          hasGithubPack: fd.get("hasGithubPack") === "on",
          hasStudentId: fd.get("hasStudentId") === "on",
        });
        onSave(next);
        onDone();
      }}
    >
      <div className={fieldClass}>
        <label htmlFor="eligibility-country">Country</label>
        <select
          id="eligibility-country"
          name="country"
          defaultValue={current.country}
          onChange={(e) => setCountry(e.target.value)}
          className={inputClass}
        >
          {COUNTRIES.map(([code, label]) => (
            <option key={code} value={code}>
              {label}
            </option>
          ))}
        </select>
      </div>
      {country === "IN" && (
        <div className={fieldClass}>
          <label htmlFor="eligibility-state">State</label>
          <input id="eligibility-state" name="state" defaultValue={current.state ?? ""} placeholder="e.g. Kerala" className={inputClass} />
        </div>
      )}
      <div className={fieldClass}>
        <label htmlFor="eligibility-level">Degree level</label>
        <select id="eligibility-level" name="level" defaultValue={current.level ?? ""} className={inputClass}>
          <option value="">Prefer not to say</option>
          {ELIGIBILITY_LEVEL_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div className={fieldClass}>
        <label htmlFor="eligibility-year">Year of study</label>
        <select id="eligibility-year" name="year" defaultValue={current.year ?? ""} className={inputClass}>
          <option value="">Prefer not to say</option>
          {YEARS.map((y) => (
            <option key={y} value={y}>
              {y === 5 ? "5th year or later" : `Year ${y}`}
            </option>
          ))}
        </select>
      </div>
      <div className={fieldClass}>
        <label htmlFor="eligibility-field">Branch / field</label>
        <select id="eligibility-field" name="field" defaultValue={current.field ?? ""} className={inputClass}>
          <option value="">Prefer not to say</option>
          {BRANCHES.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <fieldset className="flex flex-col gap-2 text-sm">
        <legend className="mb-1">I have</legend>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="hasEduEmail" defaultChecked={current.hasEduEmail} />a .edu / college email
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="hasGithubPack" defaultChecked={current.hasGithubPack} />
          the GitHub Student Developer Pack
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="hasStudentId" defaultChecked={current.hasStudentId} />a valid student ID
        </label>
      </fieldset>
      <DialogFooter className="gap-2">
        {profile && (
          <button
            type="button"
            className="text-sm text-muted-foreground underline"
            onClick={() => {
              onSave(null);
              onDone();
            }}
          >
            Clear
          </button>
        )}
        <button type="submit" className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background">
          Save
        </button>
      </DialogFooter>
    </form>
  );
}
