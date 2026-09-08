import { notFound } from "next/navigation";
import { getAllResources, getCategories } from "@/lib/resources";
import { ResourceForm } from "@/components/admin/resource-form";
import { updateResource } from "../../actions";

export default async function EditResourcePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const resourceId = Number(id);

  const [categories, resources] = await Promise.all([getCategories(), getAllResources()]);
  const resource = resources.find((r) => r.id === resourceId);
  if (!resource) notFound();

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold">Edit {resource.name}</h1>
      <ResourceForm categories={categories} resource={resource} action={updateResource.bind(null, resourceId)} />
    </div>
  );
}
