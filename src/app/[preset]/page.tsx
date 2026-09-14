import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { DirectoryClient } from "@/components/directory/directory-client";
import { getAllResources, getAllTags, getCategories } from "@/lib/resources";
import { applyFilters } from "@/lib/directory-filters";
import { getPreset, fullFilters, PRESETS } from "@/lib/presets";
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
  const fuse = new Fuse(resources, { keys: ["name", "tagline", "description", "tags"], threshold: 0.35 });
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

  const resources = await getAllResources();
  const categories = await getCategories();
  const allTags = getAllTags(resources);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      <h1 className="mb-1 text-2xl font-bold tracking-tight">{preset.title}</h1>
      <p className="text-muted-foreground mb-6">{preset.description}</p>
      <DirectoryClient
        resources={resources}
        categories={categories}
        allTags={allTags}
        initialFilters={preset.filters}
      />
    </main>
  );
}
