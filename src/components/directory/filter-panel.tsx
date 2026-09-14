"use client";

import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { TagFilter } from "./tag-filter";
import { cn } from "@/lib/utils";
import type { Category } from "@/lib/resources";

const COST_TYPES = ["free", "discount", "stipend", "scholarship", "credits", "trial"] as const;

export function FilterPanel({
  search,
  onSearchChange,
  costType,
  onToggleCostType,
  worksInIndia,
  onToggleWorksInIndia,
  categories,
  categoryCounts,
  selectedCategories,
  onToggleCategory,
  topTagList,
  selectedTags,
  onToggleTag,
  allTags,
  onTagsChange,
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
}) {
  return (
    <div className="flex flex-col gap-5">
      <Input
        placeholder="Search resources... (try a typo, e.g. 'gtihub')"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
      />

      <details open>
        <summary className="mb-2 cursor-pointer text-sm font-semibold">Cost type</summary>
        <div className="flex flex-wrap gap-1.5">
          {COST_TYPES.map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={costType.includes(c)}
              onClick={() => onToggleCostType(c)}
              className={cn(
                "min-h-11 rounded-full border px-3 py-1.5 text-sm capitalize transition-colors",
                costType.includes(c)
                  ? "border-primary bg-primary text-primary-foreground"
                  : "hover:bg-accent",
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </details>

      <details open>
        <summary className="mb-2 cursor-pointer text-sm font-semibold">Region</summary>
        <label className="flex min-h-11 items-center justify-between rounded-md border px-3 py-2 text-sm">
          <span>🇮🇳 Works in India</span>
          <input
            type="checkbox"
            checked={worksInIndia}
            onChange={onToggleWorksInIndia}
            className="size-5"
          />
        </label>
      </details>

      <details>
        <summary className="mb-2 cursor-pointer text-sm font-semibold">Category</summary>
        <div className="flex flex-col gap-1.5">
          {categories.map((c) => (
            <label
              key={c.slug}
              className="flex min-h-11 items-center justify-between gap-2 rounded-md px-1 py-1 text-sm hover:bg-accent"
            >
              <span className="flex items-center gap-2">
                <Checkbox
                  checked={selectedCategories.includes(c.slug)}
                  onCheckedChange={() => onToggleCategory(c.slug)}
                />
                {c.icon} {c.name}
              </span>
              <span className="text-muted-foreground text-xs">{categoryCounts[c.slug] ?? 0}</span>
            </label>
          ))}
        </div>
      </details>

      <details>
        <summary className="mb-2 cursor-pointer text-sm font-semibold">Tags</summary>
        <div className="flex flex-wrap items-center gap-1.5">
          {topTagList.map((tag) => (
            <button
              key={tag}
              type="button"
              aria-pressed={selectedTags.includes(tag)}
              onClick={() => onToggleTag(tag)}
              className={cn(
                "min-h-11 rounded-full border px-3 py-1.5 text-sm transition-colors",
                selectedTags.includes(tag)
                  ? "border-primary bg-primary text-primary-foreground"
                  : "hover:bg-accent",
              )}
            >
              {tag}
            </button>
          ))}
          <TagFilter allTags={allTags} selected={selectedTags} onChange={onTagsChange} />
        </div>
      </details>
    </div>
  );
}
