import type { FlagshipRefreshEntry } from "@/lib/flagship-freshness";

// Issue #120: curated flagship programs whose dates need a re-check on the
// official page. The fix is an edit to src/lib/flagship-opportunities.ts
// (dates, `source`, `verifiedOn`), so each row links to the source page.
export function FlagshipRefreshList({ entries, total }: { entries: FlagshipRefreshEntry[]; total: number }) {
  return (
    <section className="mb-10" aria-labelledby="flagship-refresh">
      <h2 id="flagship-refresh" className="mb-1 text-lg font-bold">
        Curated programs to re-check ({entries.length})
      </h2>
      {entries.length === 0 ? (
        <p className="text-muted-foreground text-sm">All {total} curated programs are up to date.</p>
      ) : (
        <>
          <p className="text-muted-foreground mb-3 text-sm">
            Update the dates, <code>source</code>, and <code>verifiedOn</code> in{" "}
            <code>src/lib/flagship-opportunities.ts</code> from each official page.
          </p>
          <ul className="border-line divide-line divide-y border-y text-sm">
            {entries.map((entry) => (
              <li key={entry.slug} className="flex flex-col gap-1 py-2 sm:flex-row sm:items-baseline sm:gap-4">
                <span className="font-medium sm:w-64 sm:shrink-0">{entry.name}</span>
                <span className="text-muted-foreground flex-1">
                  {entry.reasons.map((reason) => reason.message).join("; ")}
                </span>
                <a
                  href={entry.source}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 underline"
                >
                  Official page
                </a>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
