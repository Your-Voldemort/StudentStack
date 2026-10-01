"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Fuse from "fuse.js";
import { X, LayoutGrid, List, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { applyFilters, countByCategory, topTags, type DirectoryFilters } from "@/lib/directory-filters";
import type { Category, Resource } from "@/lib/resources";
import { FilterPanel } from "./filter-panel";
import { MobileFilterSheet } from "./mobile-filter-sheet";
import { ResourceCard } from "./resource-card";
import styles from "./directory.module.css";

const PAGE_SIZE = 30;
const STORAGE_KEY = "studentstack:last-filters";

const VERIFICATION_LABELS: Record<string, string> = {
  none: "No verification",
  edu_email: ".edu email",
  github_student_pack: "GitHub Student Pack",
  student_id: "Student ID upload",
};

const DURATION_LABELS: Record<string, string> = {
  one_time: "One-time",
  one_year: "1 year",
  while_student: "While student",
  lifetime: "Lifetime",
};

function parseListParam(param: string | null): string[] {
  return param ? param.split(",").filter(Boolean) : [];
}

function readStoredFilters(): Partial<DirectoryFilters> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Partial<DirectoryFilters>) : {};
  } catch {
    return {};
  }
}

export function DirectoryClient({
  resources,
  categories,
  allTags,
  initialFilters,
}: {
  resources: Resource[];
  categories: Category[];
  allTags: string[];
  initialFilters?: Partial<DirectoryFilters>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Deliberately NOT reading localStorage here. This component is
  // server-rendered for the initial HTML, and `localStorage` doesn't exist
  // on the server — computing these initial values from it would make the
  // client's first render (before hydration) disagree with the server-
  // rendered markup, a real hydration-mismatch bug (verified: it cascades
  // into React discarding and regenerating this whole subtree). Every
  // field below matches exactly what the server rendered — URL params or
  // `initialFilters` (a plain prop, identical on server and client), never
  // browser-only state. The stored-filter restore happens in a `useEffect`
  // below instead, strictly after hydration completes.
  const [search, setSearch] = useState(searchParams.get("q") ?? initialFilters?.search ?? "");
  const [category, setCategory] = useState<string[]>(
    searchParams.get("category")
      ? parseListParam(searchParams.get("category"))
      : (initialFilters?.category ?? []),
  );
  const [region, setRegion] = useState(searchParams.get("region") ?? initialFilters?.region ?? "all");
  const [costType, setCostType] = useState<string[]>(
    searchParams.get("cost") ? parseListParam(searchParams.get("cost")) : (initialFilters?.costType ?? []),
  );
  const [tags, setTags] = useState<string[]>(
    searchParams.get("tags") ? parseListParam(searchParams.get("tags")) : (initialFilters?.tags ?? []),
  );
  const [verificationNeeded, setVerificationNeeded] = useState<string[]>(
    searchParams.get("verification")
      ? parseListParam(searchParams.get("verification"))
      : (initialFilters?.verificationNeeded ?? []),
  );
  const [creditCardRequired, setCreditCardRequired] = useState<string[]>(
    searchParams.get("card")
      ? parseListParam(searchParams.get("card"))
      : (initialFilters?.creditCardRequired ?? []),
  );
  const [duration, setDuration] = useState<string[]>(
    searchParams.get("duration")
      ? parseListParam(searchParams.get("duration"))
      : (initialFilters?.duration ?? []),
  );
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [sort, setSort] = useState<"recommended" | "name" | "recent">("recommended");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const deferredSearch = useDeferredValue(search);

  function syncUrl(next: {
    search?: string;
    category?: string[];
    region?: string;
    costType?: string[];
    tags?: string[];
    verificationNeeded?: string[];
    creditCardRequired?: string[];
    duration?: string[];
  }) {
    const params = new URLSearchParams();
    const s = next.search ?? search;
    const c = next.category ?? category;
    const r = next.region ?? region;
    const ct = next.costType ?? costType;
    const t = next.tags ?? tags;
    const v = next.verificationNeeded ?? verificationNeeded;
    const cc = next.creditCardRequired ?? creditCardRequired;
    const d = next.duration ?? duration;
    if (s) params.set("q", s);
    if (c.length) params.set("category", c.join(","));
    if (r !== "all") params.set("region", r);
    if (ct.length) params.set("cost", ct.join(","));
    if (t.length) params.set("tags", t.join(","));
    if (v.length) params.set("verification", v.join(","));
    if (cc.length) params.set("card", cc.join(","));
    if (d.length) params.set("duration", d.join(","));
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
    () => ({
      search: deferredSearch,
      category,
      region,
      costType,
      tags,
      verificationNeeded,
      creditCardRequired,
      duration,
    }),
    [deferredSearch, category, region, costType, tags, verificationNeeded, creditCardRequired, duration],
  );

  // Restore remembered filters after mount, only on a bare /directory visit
  // (no preset, no URL params of its own — either always wins over a
  // remembered selection). Must run in an effect, strictly after hydration
  // completes: reading localStorage during the initial render (this
  // component's first pass, before mount) would make that render disagree
  // with the server-rendered markup — the same hydration-mismatch class of
  // bug as ThemeToggle, and for the same reason.
  useEffect(() => {
    if (initialFilters || searchParams.size > 0) return;
    const saved = readStoredFilters();
    if (!saved.search && !saved.category?.length && !saved.region && !saved.costType?.length &&
        !saved.tags?.length && !saved.verificationNeeded?.length && !saved.creditCardRequired?.length &&
        !saved.duration?.length) {
      return;
    }
    /* eslint-disable react-hooks/set-state-in-effect -- see comment above: must run strictly post-hydration */
    if (saved.search) setSearch(saved.search);
    if (saved.category?.length) setCategory(saved.category);
    if (saved.region && saved.region !== "all") setRegion(saved.region);
    if (saved.costType?.length) setCostType(saved.costType);
    if (saved.tags?.length) setTags(saved.tags);
    if (saved.verificationNeeded?.length) setVerificationNeeded(saved.verificationNeeded);
    if (saved.creditCardRequired?.length) setCreditCardRequired(saved.creditCardRequired);
    if (saved.duration?.length) setDuration(saved.duration);
    /* eslint-enable react-hooks/set-state-in-effect */
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional one-time restore on mount
  }, []);

  // Persisting to localStorage is synchronizing with an external system
  // (not mirroring React state), which is exactly what useEffect is for —
  // unlike the restore above, this doesn't call any state setter.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
    } catch {
      // storage unavailable (private browsing, quota) — filters still work, just not remembered
    }
  }, [filters]);

  const filtered = useMemo(() => {
    const result = applyFilters(resources, filters, fuse);
    if (sort === "name") {
      return [...result].sort((a, b) => a.name.localeCompare(b.name));
    }
    if (sort === "recent") {
      return [...result].sort((a, b) => {
        const aTime = a.lastVerifiedAt ?? 0;
        const bTime = b.lastVerifiedAt ?? 0;
        return bTime - aTime;
      });
    }
    return result;
  }, [resources, filters, fuse, sort]);

  const categoryCounts = useMemo(
    () => countByCategory(applyFilters(resources, filters, fuse, "category")),
    [resources, filters, fuse],
  );

  const topTagList = useMemo(() => topTags(resources, 8), [resources]);

  // Reset pagination when the active filters change. Adjusting state during
  // render (React's documented pattern for this) instead of in a useEffect —
  // an effect here would call setState synchronously on every filter change,
  // which react-hooks/set-state-in-effect flags as a cascading-render risk.
  const filterKey = JSON.stringify([
    category,
    region,
    costType,
    tags,
    verificationNeeded,
    creditCardRequired,
    duration,
    deferredSearch,
  ]);
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

  function toggleVerificationNeeded(value: string) {
    const next = verificationNeeded.includes(value)
      ? verificationNeeded.filter((v) => v !== value)
      : [...verificationNeeded, value];
    setVerificationNeeded(next);
    syncUrl({ verificationNeeded: next });
  }

  function toggleCreditCardRequired(value: string) {
    const next = creditCardRequired.includes(value)
      ? creditCardRequired.filter((v) => v !== value)
      : [...creditCardRequired, value];
    setCreditCardRequired(next);
    syncUrl({ creditCardRequired: next });
  }

  function toggleDuration(value: string) {
    const next = duration.includes(value) ? duration.filter((v) => v !== value) : [...duration, value];
    setDuration(next);
    syncUrl({ duration: next });
  }

  function clearAll() {
    setSearch("");
    setCategory([]);
    setRegion("all");
    setCostType([]);
    setTags([]);
    setVerificationNeeded([]);
    setCreditCardRequired([]);
    setDuration([]);
    router.replace("/directory", { scroll: false });
  }

  const hasActiveFilters =
    search ||
    category.length > 0 ||
    region !== "all" ||
    costType.length > 0 ||
    tags.length > 0 ||
    verificationNeeded.length > 0 ||
    creditCardRequired.length > 0 ||
    duration.length > 0;

  const activeFilterCount =
    category.length +
    costType.length +
    tags.length +
    verificationNeeded.length +
    creditCardRequired.length +
    duration.length +
    (region !== "all" ? 1 : 0) +
    (search ? 1 : 0);

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
    ...verificationNeeded.map((v) => ({
      key: `verification-${v}`,
      label: `Verification: ${VERIFICATION_LABELS[v] ?? v}`,
      onRemove: () => toggleVerificationNeeded(v),
    })),
    ...creditCardRequired.map((v) => ({
      key: `card-${v}`,
      label: `Card required: ${v === "yes" ? "Yes" : "No"}`,
      onRemove: () => toggleCreditCardRequired(v),
    })),
    ...duration.map((v) => ({
      key: `duration-${v}`,
      label: `Duration: ${DURATION_LABELS[v] ?? v}`,
      onRemove: () => toggleDuration(v),
    })),
  ];

  return (
    <div className={styles.layout}>
      <div className={styles.mobileBar}>
        <input
          placeholder="Search offers..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            syncUrl({ search: e.target.value });
          }}
          className={styles.mobileSearch}
          aria-label="Search offers"
        />
        <button
          type="button"
          className={styles.filterBtn}
          onClick={() => setFilterSheetOpen(true)}
          aria-label="Open filter options"
        >
          <SlidersHorizontal className="size-3.5" aria-hidden />
          <span>Filters</span>
          {activeFilterCount > 0 && <span className={styles.filterBadge}>{activeFilterCount}</span>}
        </button>
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
        verificationNeeded={verificationNeeded}
        onToggleVerificationNeeded={toggleVerificationNeeded}
        creditCardRequired={creditCardRequired}
        onToggleCreditCardRequired={toggleCreditCardRequired}
        duration={duration}
        onToggleDuration={toggleDuration}
      />

    <div style={{ display: "contents" }}>
      <aside className={styles.sidebar}>
        <div>
          <div className={styles.sideHead}>
            <h2 className={styles.sideTitle}>Filters</h2>
            <button type="button" onClick={clearAll} className={styles.resetBtn}>
              Reset
            </button>
          </div>
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
            verificationNeeded={verificationNeeded}
            onToggleVerificationNeeded={toggleVerificationNeeded}
            creditCardRequired={creditCardRequired}
            onToggleCreditCardRequired={toggleCreditCardRequired}
            duration={duration}
            onToggleDuration={toggleDuration}
          />
        </div>
      </aside>

      <div style={{ minWidth: 0 }}>
        <div className={styles.resultsHead}>
          <div className={styles.count}>
            {filtered.length} offers
          </div>
          <div className={styles.controls}>
            <label htmlFor="sort-select" style={{ color: "var(--d-muted)", fontSize: "0.88rem" }}>Sort:</label>
            <select
              id="sort-select"
              value={sort}
              onChange={(e) => setSort(e.target.value as "recommended" | "name" | "recent")}
              aria-label="Sort offers"
              className={styles.sort}
            >
              <option value="recommended">Recommended</option>
              <option value="name">Name A-Z</option>
              <option value="recent">Recently verified</option>
            </select>
            <div className={styles.viewToggle}>
              <button
                type="button"
                className={`${styles.viewBtn} ${viewMode === "grid" ? styles.viewBtnActive : ""}`}
                aria-pressed={viewMode === "grid"}
                aria-label="Grid view"
                onClick={() => setViewMode("grid")}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                type="button"
                className={`${styles.viewBtn} ${viewMode === "list" ? styles.viewBtnActive : ""}`}
                aria-pressed={viewMode === "list"}
                aria-label="List view"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {filterChips.length > 0 && (
          <div className={styles.chips}>
            {filterChips.map((chip) => (
              <span key={chip.key} className={styles.chip}>
                {chip.label}
                <button
                  type="button"
                  aria-label={`Remove ${chip.label} filter`}
                  onClick={chip.onRemove}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            <button
              type="button"
              onClick={clearAll}
              className={styles.resetBtn}
            >
              Clear all
            </button>
          </div>
        )}

        {filtered.length === 0 ? (
          <div className={styles.empty}>
            <p>No matches found. Try clearing your filters.</p>
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={clearAll} style={{ marginTop: 12 }}>
                Clear filters
              </Button>
            )}
          </div>
        ) : (
          <div className={`${styles.grid} ${viewMode === "list" ? styles.gridList : ""}`}>
            {filtered.slice(0, visibleCount).map((resource) => (
              <ResourceCard key={resource.id} resource={resource} onTagClick={addTag} />
            ))}
          </div>
        )}
        {visibleCount < filtered.length && (
          <div className={styles.loadMoreWrap}>
            <button type="button" className={styles.loadMore} onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}>
              Load more offers
            </button>
          </div>
        )}
      </div>
    </div>
    </div>
  );
}
