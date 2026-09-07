import { Suspense } from "react";
import { DirectoryClient } from "@/components/directory/directory-client";
import { DirectorySkeleton } from "@/components/directory/directory-skeleton";
import { getAllResources, getAllTags, getCategories } from "@/lib/resources";

export default function DirectoryPage() {
  const resources = getAllResources();
  const categories = getCategories();
  const allTags = getAllTags(resources);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      <h1 className="mb-1 text-2xl font-bold tracking-tight">Directory</h1>
      <p className="text-muted-foreground mb-6">
        {resources.length}+ free tools, discounts, and opportunities for students.
      </p>
      <Suspense fallback={<DirectorySkeleton />}>
        <DirectoryClient resources={resources} categories={categories} allTags={allTags} />
      </Suspense>
    </main>
  );
}
