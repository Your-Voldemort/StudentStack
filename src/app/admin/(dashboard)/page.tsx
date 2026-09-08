import Link from "next/link";
import { sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { getAllResources, getCategories } from "@/lib/resources";
import { updateStatus, deleteResource } from "./actions";

const STATUS_OPTIONS = ["active", "expired", "broken"] as const;

export default async function AdminDashboard() {
  const [resources, categories, [{ maxVerified }]] = await Promise.all([
    getAllResources(),
    getCategories(),
    db
      .select({ maxVerified: sql<string | null>`max(${schema.resources.lastVerifiedAt})` })
      .from(schema.resources),
  ]);

  const counts = { active: 0, expired: 0, broken: 0 } as Record<string, number>;
  for (const r of resources) counts[r.status]++;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex gap-6 text-sm">
          <span>{counts.active} active</span>
          <span>{counts.broken} broken</span>
          <span>{counts.expired} expired</span>
          <span className="text-muted-foreground">
            Last link check: {maxVerified ? new Date(maxVerified).toLocaleString() : "never"}
          </span>
        </div>
        <Link href="/admin/resources/new" className="bg-orange rounded-md px-4 py-2 text-sm font-medium">
          Add resource
        </Link>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-line border-b text-left">
            <th className="py-2">Name</th>
            <th>Category</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {resources.map((r) => {
            const category = categories.find((c) => c.slug === r.categorySlug);
            return (
              <tr key={r.id} className="border-line border-b">
                <td className="py-2">{r.name}</td>
                <td>{category?.name ?? r.categorySlug}</td>
                <td>
                  <form action={updateStatus.bind(null, r.id)} className="flex items-center gap-2">
                    <select name="status" defaultValue={r.status} className="border-line rounded border px-2 py-1">
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <button type="submit" className="text-xs underline">
                      Save
                    </button>
                  </form>
                </td>
                <td className="space-x-3 text-right">
                  <Link href={`/admin/resources/${r.id}`} className="underline">
                    Edit
                  </Link>
                  <form action={deleteResource.bind(null, r.id)} className="inline">
                    <button type="submit" className="text-destructive underline">
                      Delete
                    </button>
                  </form>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
