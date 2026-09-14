"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Fuse from "fuse.js";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { applyFilters, countByCategory, topTags, type DirectoryFilters } from "@/lib/directory-filters";
import type { Category, Resource } from "@/lib/resources";
import { FilterPanel } from "./filter-panel";
import { MobileFilterSheet } from "./mobile-filter-sheet";
import { ResourceCard } from "./resource-card";

const PAGE_SIZE = 30;

function parseListParam(param: string | null): string[] {
  return param ? param.split(",").filter(Boolean) : [];
}

export function DirectoryClient({
  resources,
  categories,
  allTags,
}: {
  resources: Resource[];
  categories: Category[];
  allTags: string[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [category, setCategory] = useState<string[]>(parseListParam(searchParams.get("category")));
  const [region, setRegion] = useState(searchParams.get("region") ?? "all");
  const [costType, setCostType] = useState<string[]>(parseListParam(searchParams.get("cost")));
  const [tags, setTags] = useState<string[]>(parseListParam(searchParams.get("tags")));
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  const deferredSearch = useDeferredValue(search);

  function syncUrl(next: {
    search?: string;
    category?: string[];
    region?: string;
    costType?: string[];
    tags?: string[];
  }) {
    const params = new URLSearchParams();
    const s = next.search ?? search;
    const c = next.category ?? category;
    const r = next.region ?? region;
    const ct = next.costType ?? costType;
    const t = next.tags ?? tags;
    if (s) params.set("q", s);
    if (c.length) params.set("category", c.join(","));
    if (r !== "all") params.set("region", r);
    if (ct.length) params.set("cost", ct.join(","));
    if (t.length) params.set("tags", t.join(","));
    router.replace(`/directory${params.size ? `?${params}` : ""}`, { scroll: false });
  }

  const fuse = useMemo(
    () =>
      new Fuse(resources, {
        keys: ["name", "tagline", "description", "tags"],
        threshold: 0.35,
      }),
    [resources],
  );

  const filters: DirectoryFilters = useMemo(
    () => ({ search: deferredSearch, category, region, costType, tags }),
    [deferredSearch, category, region, costType, tags],
  );

  const filtered = useMemo(
    () => applyFilters(resources, filters, fuse),
    [resources, filters, fuse],
  );

  const categoryCounts = useMemo(
    () => countByCategory(applyFilters(resources, filters, fuse, "category")),
    [resources, filters, fuse],
  );

  const topTagList = useMemo(() => topTags(resources, 8), [resources]);

  // Reset pagination when the active filters change. Adjusting state during
  // render (React's documented pattern for this) instead of in a useEffect —
  // an effect here would call setState synchronously on every filter change,
  // which react-hooks/set-state-in-effect flags as a cascading-render risk.
  const filterKey = JSON.stringify([category, region, costType, tags, deferredSearch]);
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    setVisibleCount(PAGE_SIZE);
  }

  function addTag(tag: string) {
    const next = tags.includes(tag) ? tags : [...tags, tag];
    setTags(next);
    syncUrl({ tags: next });
  }

  function removeTag(tag: string) {
    const next = tags.filter((t) => t !== tag);
    setTags(next);
    syncUrl({ tags: next });
  }

  function toggleCategory(slug: string) {
    const next = category.includes(slug) ? category.filter((c) => c !== slug) : [...category, slug];
    setCategory(next);
    syncUrl({ category: next });
  }

  function addOrRemoveTag(tag: string) {
    if (tags.includes(tag)) {
      removeTag(tag);
    } else {
      addTag(tag);
    }
  }

  function toggleCostType(value: string) {
    const next = costType.includes(value)
      ? costType.filter((c) => c !== value)
      : [...costType, value];
    setCostType(next);
    syncUrl({ costType: next });
  }

  function clearAll() {
    setSearch("");
    setCategory([]);
    setRegion("all");
    setCostType([]);
    setTags([]);
    router.replace("/directory", { scroll: false });
  }

  const hasActiveFilters =
    search || category.length > 0 || region !== "all" || costType.length > 0 || tags.length > 0;

  const activeFilterCount =
    category.length + costType.length + tags.length + (region !== "all" ? 1 : 0) + (search ? 1 : 0);

  // Every active facet filter becomes a removable chip, so the current
  // selection is always visible at a glance, not just implied by the count.
  const filterChips: { key: string; label: string; onRemove: () => void }[] = [
    ...category.map((slug) => ({
      key: `category-${slug}`,
      label: categories.find((c) => c.slug === slug)?.name ?? slug,
      onRemove: () => {
        const next = category.filter((s) => s !== slug);
        setCategory(next);
        syncUrl({ category: next });
      },
    })),
    ...(region !== "all"
      ? [
          {
            key: "region",
            label: `Region: ${region}`,
            onRemove: () => {
              setRegion("all");
              syncUrl({ region: "all" });
            },
          },
        ]
      : []),
    ...costType.map((c) => ({
      key: `cost-${c}`,
      label: `Cost: ${c[0].toUpperCase()}${c.slice(1)}`,
      onRemove: () => {
        const next = costType.filter((x) => x !== c);
        setCostType(next);
        syncUrl({ costType: next });
      },
    })),
    ...tags.map((tag) => ({ key: `tag-${tag}`, label: tag, onRemove: () => removeTag(tag) })),
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 md:hidden">
        <Input
          placeholder="Search resources..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            syncUrl({ search: e.target.value });
          }}
          className="flex-1"
        />
        <Button variant="outline" className="min-h-11" onClick={() => setFilterSheetOpen(true)}>
          Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
        </Button>
      </div>

      <MobileFilterSheet
        open={filterSheetOpen}
        onOpenChange={setFilterSheetOpen}
        resultCount={filtered.length}
        search={search}
        onSearchChange={(v) => {
          setSearch(v);
          syncUrl({ search: v });
        }}
        costType={costType}
        onToggleCostType={toggleCostType}
        worksInIndia={region === "IN"}
        onToggleWorksInIndia={() => {
          const next = region === "IN" ? "all" : "IN";
          setRegion(next);
          syncUrl({ region: next });
        }}
        categories={categories}
        categoryCounts={categoryCounts}
        selectedCategories={category}
        onToggleCategory={toggleCategory}
        topTagList={topTagList}
        selectedTags={tags}
        onToggleTag={addOrRemoveTag}
        allTags={allTags}
        onTagsChange={(next) => {
          setTags(next);
          syncUrl({ tags: next });
        }}
      />

    <div className="grid grid-cols-1 gap-6 md:grid-cols-[260px_1fr]">
      <aside className="hidden md:block">
        <div className="sticky top-8">
          <FilterPanel
            search={search}
            onSearchChange={(v) => {
              setSearch(v);
              syncUrl({ search: v });
            }}
            costType={costType}
            onToggleCostType={toggleCostType}
            worksInIndia={region === "IN"}
            onToggleWorksInIndia={() => {
              const next = region === "IN" ? "all" : "IN";
              setRegion(next);
              syncUrl({ region: next });
            }}
            categories={categories}
            categoryCounts={categoryCounts}
            selectedCategories={category}
            onToggleCategory={toggleCategory}
            topTagList={topTagList}
            selectedTags={tags}
            onToggleTag={addOrRemoveTag}
            allTags={allTags}
            onTagsChange={(next) => {
              setTags(next);
              syncUrl({ tags: next });
            }}
          />
        </div>
      </aside>

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <p className="text-muted-foreground text-sm">
            {filtered.length} of {resources.length} resources
          </p>
          {filterChips.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {filterChips.map((chip) => (
                <Badge key={chip.key} variant="secondary" className="gap-1">
                  {chip.label}
                  <button
                    type="button"
                    aria-label={`Remove ${chip.label} filter`}
                    onClick={chip.onRemove}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              <button
                type="button"
                onClick={clearAll}
                className="text-muted-foreground text-sm underline underline-offset-2"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-16 text-center">
            <p className="text-muted-foreground">No matches — try removing a filter.</p>
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={clearAll}>
                Clear filters
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.slice(0, visibleCount).map((resource) => (
              <ResourceCard key={resource.id} resource={resource} onTagClick={addTag} />
            ))}
          </div>
        )}
        {visibleCount < filtered.length && (
          <div className="flex justify-center pt-2">
            <Button variant="outline" onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}>
              Load {Math.min(PAGE_SIZE, filtered.length - visibleCount)} more (
              {filtered.length - visibleCount} remaining)
            </Button>
          </div>
        )}
      </div>
    </div>
    </div>
  );
}
