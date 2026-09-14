import { Suspense } from "react";
import Link from "next/link";
import { DirectoryClient } from "@/components/directory/directory-client";
import { DirectorySkeleton } from "@/components/directory/directory-skeleton";
import { getAllResources, getAllTags, getCategories } from "@/lib/resources";
import { PRESETS } from "@/lib/presets";

// Resources change via admin CRUD and the link-health cron; without this,
// Next statically prerenders the page at build time and revalidatePath's
// on-demand regeneration doesn't reliably re-run this Server Component in
// self-hosted mode (verified: it re-marks the cache but keeps serving the
// build-time snapshot). Force per-request rendering instead.
export const dynamic = "force-dynamic";

export default async function DirectoryPage() {
  const resources = await getAllResources();
  const categories = await getCategories();
  const allTags = getAllTags(resources);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      <h1 className="mb-1 text-2xl font-bold tracking-tight">Directory</h1>
      <p className="text-muted-foreground mb-6">
        {resources.length}+ free tools, discounts, and opportunities for students.
      </p>
      <div className="mb-6 flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <Link
            key={p.slug}
            href={`/${p.slug}`}
            className="flex min-h-11 items-center rounded-full border px-3 py-1.5 text-sm hover:bg-accent"
          >
            {p.label}
          </Link>
        ))}
      </div>
      <Suspense fallback={<DirectorySkeleton />}>
        <DirectoryClient resources={resources} categories={categories} allTags={allTags} />
      </Suspense>
    </main>
  );
}
