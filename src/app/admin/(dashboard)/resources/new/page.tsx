import { getCategories } from "@/lib/resources";
import { ResourceForm } from "@/components/admin/resource-form";
import { createResource } from "../../actions";

export default async function NewResourcePage() {
  const categories = await getCategories();
  return (
    <div>
      <h1 className="mb-6 text-xl font-bold">Add resource</h1>
      <ResourceForm categories={categories} action={createResource} />
    </div>
  );
}
