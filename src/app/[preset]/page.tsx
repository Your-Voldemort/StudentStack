import { notFound } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { DirectoryClient } from "@/components/directory/directory-client";
import { DirectorySkeleton } from "@/components/directory/directory-skeleton";
import { SiteHeader } from "@/components/home/site-chrome";
import { passFontVariables } from "@/lib/fonts";
import { getAllResources, getAllTags, getCategories, getResourceCount } from "@/lib/resources";
import { applyFilters } from "@/lib/directory-filters";
import { getPreset, fullFilters, PRESETS } from "@/lib/presets";
import dirStyles from "@/components/directory/directory.module.css";
import homeStyles from "@/components/home/brand.module.css";
import Fuse from "fuse.js";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return PRESETS.map((p) => ({ preset: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ preset: string }>;
}): Promise<Metadata> {
  const { preset: slug } = await params;
  const preset = getPreset(slug);
  if (!preset) return {};
  const resources = await getAllResources();
  const fuse = new Fuse(resources, {
    keys: ["name", "tagline", "description", "tags"],
    threshold: 0.4,
    ignoreLocation: true,
  });
  const count = applyFilters(resources, fullFilters(preset.filters), fuse).length;
  return {
    title: `${preset.title} | StudentStack`,
    description: `${preset.description} ${count} resources currently match.`,
  };
}

export default async function PresetPage({
  params,
}: {
  params: Promise<{ preset: string }>;
}) {
  const { preset: slug } = await params;
  const preset = getPreset(slug);
  if (!preset) notFound();

  const [resources, categories, total] = await Promise.all([
    getAllResources(),
    getCategories(),
    getResourceCount(),
  ]);
  const allTags = getAllTags(resources);
  const count = resources.length || total;

  return (
    <div className={`${passFontVariables} ${homeStyles.root}`}>
      <SiteHeader total={total} />
      <div className={dirStyles.root}>
        <main className={dirStyles.wrap}>
          <section className={dirStyles.hero}>
            <p className={dirStyles.eyebrow}>
              <span className={dirStyles.eyebrowDot} aria-hidden />
              The student directory
            </p>
            <h1 className={dirStyles.headline}>
              {preset.title.split(" ").slice(0, -2).join(" ")}{" "}
              <span className={dirStyles.headlineAccent}>
                {preset.title.split(" ").slice(-2).join(" ")}
              </span>
            </h1>
            <p className={dirStyles.subcopy}>{preset.description}</p>
            <form action="/directory" method="GET" role="search" className={dirStyles.searchBar}>
              <span className={dirStyles.searchIcon} aria-hidden>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
              </span>
              <label htmlFor="preset-search" className="sr-only">Search offers</label>
              <input
                id="preset-search"
                name="q"
                type="search"
                placeholder={`Search ${count} offers...`}
                className={dirStyles.searchInput}
              />
              <button type="submit" className={dirStyles.searchBtn}>Search</button>
            </form>
            <div className={dirStyles.presets}>
              <Link href="/directory" className={dirStyles.preset}>All offers</Link>
              {PRESETS.map((p) => {
                const isActive = p.slug === slug;
                return (
                  <Link
                    key={p.slug}
                    href={`/${p.slug}`}
                    className={`${dirStyles.preset} ${isActive ? dirStyles.presetActive : ""}`}
                  >
                    {p.label}
                  </Link>
                );
              })}
            </div>
          </section>
          <Suspense fallback={<DirectorySkeleton />}>
            <DirectoryClient
              resources={resources}
              categories={categories}
              allTags={allTags}
              initialFilters={preset.filters}
            />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
