"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Fuse from "fuse.js";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Category, Resource } from "@/lib/resources";
import { ResourceCard } from "./resource-card";
import { TagFilter } from "./tag-filter";

const REGIONS = ["IN", "Global"] as const;
const COST_TYPES = ["free", "discount", "stipend", "scholarship", "credits", "trial"] as const;

function parseTags(param: string | null): string[] {
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
  const [category, setCategory] = useState(searchParams.get("category") ?? "all");
  const [region, setRegion] = useState(searchParams.get("region") ?? "all");
  const [costType, setCostType] = useState(searchParams.get("cost") ?? "all");
  const [tags, setTags] = useState<string[]>(parseTags(searchParams.get("tags")));

  const deferredSearch = useDeferredValue(search);

  function syncUrl(next: {
    search?: string;
    category?: string;
    region?: string;
    costType?: string;
    tags?: string[];
  }) {
    const params = new URLSearchParams();
    const s = next.search ?? search;
    const c = next.category ?? category;
    const r = next.region ?? region;
    const ct = next.costType ?? costType;
    const t = next.tags ?? tags;
    if (s) params.set("q", s);
    if (c !== "all") params.set("category", c);
    if (r !== "all") params.set("region", r);
    if (ct !== "all") params.set("cost", ct);
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

  const filtered = useMemo(() => {
    let list = resources;
    if (category !== "all") list = list.filter((r) => r.categorySlug === category);
    if (region !== "all") list = list.filter((r) => r.region === region);
    if (costType !== "all") list = list.filter((r) => r.costType === costType);
    if (tags.length) list = list.filter((r) => tags.every((tag) => r.tags.includes(tag)));

    if (deferredSearch.trim()) {
      const matchIds = new Set(fuse.search(deferredSearch).map((m) => m.item.id));
      list = list.filter((r) => matchIds.has(r.id));
    }
    return list;
  }, [resources, category, region, costType, tags, deferredSearch, fuse]);

  function addTag(tag: string) {
    const next = tags.includes(tag) ? tags : [...tags, tag];
    setTags(next);
    syncUrl({ tags: next });
  }

  function clearAll() {
    setSearch("");
    setCategory("all");
    setRegion("all");
    setCostType("all");
    setTags([]);
    router.replace("/directory", { scroll: false });
  }

  const hasActiveFilters =
    search || category !== "all" || region !== "all" || costType !== "all" || tags.length > 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <Input
          placeholder="Search resources... (try a typo, e.g. 'gtihub')"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            syncUrl({ search: e.target.value });
          }}
          className="sm:max-w-xs"
        />

        <Select
          value={category}
          onValueChange={(v) => {
            setCategory(v);
            syncUrl({ category: v });
          }}
        >
          <SelectTrigger className="sm:w-56">
            <SelectValue placeholder="Category">
              {category === "all"
                ? "All categories"
                : categories.find((c) => c.slug === category)?.name}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.slug} value={c.slug}>
                {c.icon} {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={region}
          onValueChange={(v) => {
            setRegion(v);
            syncUrl({ region: v });
          }}
        >
          <SelectTrigger className="sm:w-36">
            <SelectValue placeholder="Region">
              {region === "all" ? "All regions" : region}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All regions</SelectItem>
            {REGIONS.map((r) => (
              <SelectItem key={r} value={r}>
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={costType}
          onValueChange={(v) => {
            setCostType(v);
            syncUrl({ costType: v });
          }}
        >
          <SelectTrigger className="sm:w-40">
            <SelectValue placeholder="Cost type">
              {costType === "all" ? "All cost types" : costType[0].toUpperCase() + costType.slice(1)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All cost types</SelectItem>
            {COST_TYPES.map((c) => (
              <SelectItem key={c} value={c}>
                {c[0].toUpperCase() + c.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <TagFilter
          allTags={allTags}
          selected={tags}
          onChange={(next) => {
            setTags(next);
            syncUrl({ tags: next });
          }}
        />

        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearAll}
            className="text-muted-foreground text-sm underline underline-offset-2"
          >
            Clear all filters
          </button>
        )}
      </div>

      <p className="text-muted-foreground text-sm">
        {filtered.length} of {resources.length} resources
      </p>

      {filtered.length === 0 ? (
        <div className="text-muted-foreground rounded-lg border border-dashed py-16 text-center">
          No matches — try removing a filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((resource) => (
            <ResourceCard key={resource.id} resource={resource} onTagClick={addTag} />
          ))}
        </div>
      )}
    </div>
  );
}
