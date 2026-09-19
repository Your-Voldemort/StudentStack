import { getCategories } from "@/lib/resources";
import { getCandidateById } from "@/lib/ingestion/queries";
import { ResourceForm } from "@/components/admin/resource-form";
import { createResource } from "../../actions";

export default async function NewResourcePage({
  searchParams,
}: {
  searchParams: Promise<{ candidateId?: string }>;
}) {
  const { candidateId } = await searchParams;
  const categories = await getCategories();
  const candidate = candidateId ? await getCandidateById(Number(candidateId)) : undefined;

  const defaults = candidate
    ? {
        name: candidate.name,
        tagline: candidate.tagline,
        description: candidate.description,
        url: candidate.url,
        categoryId: categories.find((c) => c.slug === candidate.categorySlug)?.id,
        costType: candidate.costType ?? undefined,
        region: candidate.region ?? undefined,
        tags: candidate.tags,
      }
    : undefined;

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold">Add resource</h1>
      <ResourceForm
        categories={categories}
        action={createResource}
        defaults={defaults}
        candidateId={candidate?.id}
      />
    </div>
  );
}
