import type { Category, Resource } from "@/lib/resources";

const COST_TYPES = ["free", "discount", "stipend", "scholarship", "credits", "trial"] as const;
const STATUS_OPTIONS = ["active", "expired", "broken"] as const;

export function ResourceForm({
  categories,
  resource,
  action,
}: {
  categories: Category[];
  resource?: Resource;
  action: (formData: FormData) => void;
}) {
  return (
    <form action={action} className="flex max-w-lg flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        Name *
        <input name="name" defaultValue={resource?.name} required className="border-line rounded border px-3 py-2" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Tagline
        <input name="tagline" defaultValue={resource?.tagline ?? ""} className="border-line rounded border px-3 py-2" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Description *
        <textarea
          name="description"
          defaultValue={resource?.description}
          required
          rows={4}
          className="border-line rounded border px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        URL *
        <input
          name="url"
          type="url"
          defaultValue={resource?.url ?? ""}
          required={!resource}
          className="border-line rounded border px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Category *
        <select name="categoryId" defaultValue={resource?.categoryId} required className="border-line rounded border px-3 py-2">
          {categories.map((c) => (
            <option key={c.slug} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Cost type *
        <select name="costType" defaultValue={resource?.costType} required className="border-line rounded border px-3 py-2">
          {COST_TYPES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Region
        <select name="region" defaultValue={resource?.region ?? "Global"} className="border-line rounded border px-3 py-2">
          <option value="Global">Global</option>
          <option value="IN">India</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Tags (comma-separated)
        <input name="tags" defaultValue={resource?.tags.join(", ")} className="border-line rounded border px-3 py-2" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Deadline
        <input name="deadline" type="date" className="border-line rounded border px-3 py-2" />
      </label>
      {resource && (
        <label className="flex flex-col gap-1 text-sm">
          Status
          <select name="status" defaultValue={resource.status} className="border-line rounded border px-3 py-2">
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
      )}
      <button type="submit" className="bg-orange rounded-md px-4 py-2 font-medium">
        {resource ? "Save changes" : "Create resource"}
      </button>
    </form>
  );
}
