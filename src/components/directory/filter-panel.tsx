"use client";

import { TagFilter } from "./tag-filter";
import type { Category } from "@/lib/resources";
import { ChevronRight } from "lucide-react";
import styles from "./directory.module.css";

const COST_TYPES = ["free", "discount", "credits", "scholarship"] as const;
const COST_EXTRA = ["stipend", "trial"] as const;
const PLATFORM_TAGS = ["Web", "macOS", "Windows", "iOS", "Android"];

export function FilterPanel({
  costType,
  onToggleCostType,
  worksInIndia,
  onToggleWorksInIndia,
  categories,
  categoryCounts,
  selectedCategories,
  onToggleCategory,
  selectedTags,
  onToggleTag,
  allTags,
  onTagsChange,
  verificationNeeded,
  onToggleVerificationNeeded,
  creditCardRequired,
  onToggleCreditCardRequired,
  duration,
  onToggleDuration,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  costType: string[];
  onToggleCostType: (v: string) => void;
  worksInIndia: boolean;
  onToggleWorksInIndia: () => void;
  categories: Category[];
  categoryCounts: Record<string, number>;
  selectedCategories: string[];
  onToggleCategory: (slug: string) => void;
  topTagList: string[];
  selectedTags: string[];
  onToggleTag: (tag: string) => void;
  allTags: string[];
  onTagsChange: (tags: string[]) => void;
  verificationNeeded: string[];
  onToggleVerificationNeeded: (v: string) => void;
  creditCardRequired: string[];
  onToggleCreditCardRequired: (v: string) => void;
  duration: string[];
  onToggleDuration: (v: string) => void;
}) {
  return (
    <div>
      <details open className={styles.group}>
        <summary className={styles.groupTitle}>
          <span>Cost type</span>
          <ChevronRight className={styles.chevronIcon} />
        </summary>
        <div className={styles.checkList}>
          {[...COST_TYPES, ...COST_EXTRA].map((c) => (
            <label key={c} className={styles.check}>
              <input
                type="checkbox"
                checked={costType.includes(c)}
                onChange={() => onToggleCostType(c)}
              />
              <span style={{ textTransform: "capitalize" }}>{c}</span>
            </label>
          ))}
        </div>
      </details>

      <details className={styles.group}>
        <summary className={styles.groupTitle}>
          <span>Region</span>
          <ChevronRight className={styles.chevronIcon} />
        </summary>
        <div className={styles.checkList}>
          <label className={styles.check}>
            <input type="checkbox" checked={worksInIndia} onChange={onToggleWorksInIndia} />
            <span>Works in India</span>
          </label>
        </div>
      </details>

      <details className={styles.group}>
        <summary className={styles.groupTitle}>
          <span>Category</span>
          <ChevronRight className={styles.chevronIcon} />
        </summary>
        <div className={styles.checkList}>
          {categories.map((c) => (
            <label key={c.slug} className={styles.check} style={{ justifyContent: "space-between" }}>
              <span style={{ display: "flex", gap: 9, alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={selectedCategories.includes(c.slug)}
                  onChange={() => onToggleCategory(c.slug)}
                />
                {c.name}
              </span>
              <span style={{ color: "var(--d-muted)", fontSize: "0.75rem", fontVariantNumeric: "tabular-nums" }}>
                {categoryCounts[c.slug] ?? 0}
              </span>
            </label>
          ))}
        </div>
      </details>

      <details className={styles.group}>
        <summary className={styles.groupTitle}>
          <span>Platform</span>
          <ChevronRight className={styles.chevronIcon} />
        </summary>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
          {PLATFORM_TAGS.filter((p) => allTags.includes(p)).map((platform) => (
            <button
              key={platform}
              type="button"
              aria-pressed={selectedTags.includes(platform)}
              onClick={() => onToggleTag(platform)}
              className={`${styles.preset} ${selectedTags.includes(platform) ? styles.presetActive : ""}`}
              style={{ minHeight: 28, fontSize: "0.75rem", padding: "0 10px" }}
            >
              {platform}
            </button>
          ))}
        </div>
      </details>

      <details className={styles.group}>
        <summary className={styles.groupTitle}>
          <span>More filters</span>
          <ChevronRight className={styles.chevronIcon} />
        </summary>
        <p style={{ color: "var(--d-muted)", fontSize: "0.75rem", margin: "6px 0 8px" }}>
          Verification, credit card & duration
        </p>
        <div className={styles.checkList}>
          {([["none", "No verification"], ["edu_email", ".edu email"], ["student_id", "Student ID"]] as const).map(([v, label]) => (
            <label key={v} className={styles.check}>
              <input type="checkbox" checked={verificationNeeded.includes(v)} onChange={() => onToggleVerificationNeeded(v)} />
              {label}
            </label>
          ))}
          {(["no", "yes"] as const).map((v) => (
            <label key={v} className={styles.check}>
              <input type="checkbox" checked={creditCardRequired.includes(v)} onChange={() => onToggleCreditCardRequired(v)} />
              Card required: {v === "yes" ? "Yes" : "No"}
            </label>
          ))}
          {(["one_time", "one_year", "while_student", "lifetime"] as const).map((v) => (
            <label key={v} className={styles.check}>
              <input type="checkbox" checked={duration.includes(v)} onChange={() => onToggleDuration(v)} />
              {v.replace("_", " ")}
            </label>
          ))}
        </div>
        <div style={{ marginTop: 8 }}>
          <TagFilter allTags={allTags} selected={selectedTags} onChange={onTagsChange} />
        </div>
      </details>
    </div>
  );
}
