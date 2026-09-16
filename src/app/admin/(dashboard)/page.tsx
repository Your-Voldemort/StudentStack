import Link from "next/link";
import { sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { getAllResources, getCategories, getPendingSubmissions } from "@/lib/resources";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { approveSubmission, deleteResource, rejectSubmission, updateStatus } from "./actions";

const STATUS_OPTIONS = ["active", "expired", "broken"] as const;

// Submissions store the student's auth user id; look the emails up with the
// service-role client so the queue shows who sent each offer.
async function getSubmitterEmails(ids: (string | null)[]): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter((id): id is string => Boolean(id)))];
  if (unique.length === 0) return new Map();
  const supabase = createAdminSupabaseClient();
  const entries = await Promise.all(
    unique.map(async (id) => {
      const { data } = await supabase.auth.admin.getUserById(id);
      return [id, data.user?.email ?? "Unknown account"] as const;
    }),
  );
  return new Map(entries);
}

export default async function AdminDashboard() {
  const [resources, categories, pending, [{ maxVerified }]] = await Promise.all([
    getAllResources(),
    getCategories(),
    getPendingSubmissions(),
    db
      .select({ maxVerified: sql<string | null>`max(${schema.resources.lastVerifiedAt})` })
      .from(schema.resources),
  ]);
  const submitterEmails = await getSubmitterEmails(pending.map((p) => p.submittedBy));

  const counts = { active: 0, expired: 0, broken: 0 } as Record<string, number>;
  for (const r of resources) counts[r.status]++;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex gap-6 text-sm">
          <span>{counts.active} active</span>
          <span>{counts.broken} broken</span>
          <span>{counts.expired} expired</span>
          <span>{pending.length} waiting for review</span>
          <span className="text-muted-foreground">
            Last link check: {maxVerified ? new Date(maxVerified).toLocaleString() : "never"}
          </span>
        </div>
        <Link href="/admin/resources/new" className="bg-orange rounded-md px-4 py-2 text-sm font-medium">
          Add resource
        </Link>
      </div>

      {pending.length > 0 && (
        <section className="mb-10" aria-labelledby="review-queue">
          <h2 id="review-queue" className="mb-3 text-lg font-bold">
            Waiting for review ({pending.length})
          </h2>
          <ul className="border-line divide-line divide-y border-y">
            {pending.map((submission) => (
              <li key={submission.id} className="flex flex-col gap-2 py-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-medium">{submission.name}</span>
                  <span className="text-muted-foreground text-xs">
                    {submission.categoryName} · {submission.costType} · {submission.region} · from{" "}
                    {submitterEmails.get(submission.submittedBy ?? "") ?? "Unknown account"} ·{" "}
                    {submission.createdAt.toLocaleDateString()}
                  </span>
                </div>
                {submission.tagline && <p className="text-sm">{submission.tagline}</p>}
                <p className="text-muted-foreground text-sm">{submission.description}</p>
                {submission.url && (
                  <a
                    href={submission.url}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="text-sm break-all underline"
                  >
                    {submission.url}
                  </a>
                )}
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <form action={approveSubmission.bind(null, submission.id)}>
                    <button type="submit" className="bg-orange rounded-md px-3 py-1 font-medium">
                      Approve
                    </button>
                  </form>
                  <Link href={`/admin/resources/${submission.id}`} className="underline">
                    Edit before approving
                  </Link>
                  <form action={rejectSubmission.bind(null, submission.id)}>
                    <button type="submit" className="text-destructive underline">
                      Reject
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

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
