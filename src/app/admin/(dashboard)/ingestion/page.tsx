import Link from "next/link";
import { getPendingCandidates, type PendingCandidate } from "@/lib/ingestion/queries";
import { getAllResources } from "@/lib/resources";
import { rejectCandidate } from "./actions";

export default async function IngestionReviewPage() {
  const [{ fresh, possibleDuplicates }, resources] = await Promise.all([
    getPendingCandidates(),
    getAllResources(),
  ]);
  const resourceById = new Map(resources.map((r) => [r.id, r]));

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="mb-1 text-xl font-bold">Ingestion review</h1>
        <p className="text-muted-foreground text-sm">
          {fresh.length} new, {possibleDuplicates.length} possible duplicates
        </p>
      </div>

      <section>
        <h2 className="mb-3 font-semibold">New candidates</h2>
        {fresh.length === 0 && <p className="text-muted-foreground text-sm">Nothing pending.</p>}
        <div className="flex flex-col gap-3">
          {fresh.map((c) => (
            <CandidateCard key={c.id} candidate={c} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-semibold">Possible duplicates</h2>
        {possibleDuplicates.length === 0 && <p className="text-muted-foreground text-sm">None.</p>}
        <div className="flex flex-col gap-3">
          {possibleDuplicates.map((c) => (
            <div key={c.id} className="grid grid-cols-2 gap-3">
              <CandidateCard candidate={c} />
              <div className="border-line rounded border p-3 text-sm">
                <p className="text-muted-foreground mb-1 text-xs">Matched existing resource</p>
                <p className="font-medium">
                  {c.matchedResourceId ? (resourceById.get(c.matchedResourceId)?.name ?? "Unknown") : "Unknown"}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function CandidateCard({ candidate }: { candidate: PendingCandidate }) {
  return (
    <div className="border-line flex items-start justify-between gap-3 rounded border p-3">
      <div>
        <p className="font-medium">{candidate.name}</p>
        {candidate.tagline && <p className="text-muted-foreground text-sm">{candidate.tagline}</p>}
        <p className="text-muted-foreground text-xs">from {candidate.sourceName}</p>
        {candidate.url && (
          <a href={candidate.url} target="_blank" rel="noreferrer" className="text-xs underline">
            {candidate.url}
          </a>
        )}
      </div>
      <div className="flex shrink-0 gap-3 text-sm">
        <Link href={`/admin/resources/new?candidateId=${candidate.id}`} className="underline">
          Review &amp; approve
        </Link>
        <form action={rejectCandidate.bind(null, candidate.id)}>
          <button type="submit" className="text-destructive underline">
            Reject
          </button>
        </form>
      </div>
    </div>
  );
}
