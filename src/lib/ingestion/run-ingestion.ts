import type { Resource } from "@/lib/resources";
import type { CandidateFields, IngestionSource } from "./types";
import { classifyMatch } from "./classify-match";

export type CandidateRow = CandidateFields & {
  sourceName: string;
  matchType: "new" | "possible_duplicate";
  matchedResourceId: number | null;
  rawPayload: string;
};

export type SourceRunSummary = {
  sourceName: string;
  fetched: number;
  queued: number;
  duplicates: number;
  mappingErrors: number;
  error?: string;
};

export type IngestionRunResult = {
  toInsert: CandidateRow[];
  summary: SourceRunSummary[];
};

// No DB access in here — only `source.fetchCandidates()` is async/external.
// Keeping this pure (aside from that) makes it unit-testable with a fake
// source and fixture arrays, no network or database needed.
export async function runIngestion(
  sources: IngestionSource[],
  existingResources: Resource[],
  alreadySeenKeys: Set<string>, // `${sourceName}:${externalId}`
): Promise<IngestionRunResult> {
  const toInsert: CandidateRow[] = [];
  const summary: SourceRunSummary[] = [];

  for (const source of sources) {
    const result: SourceRunSummary = {
      sourceName: source.name,
      fetched: 0,
      queued: 0,
      duplicates: 0,
      mappingErrors: 0,
    };

    try {
      const raw = await source.fetchCandidates();
      result.fetched = raw.length;

      for (const item of raw) {
        const candidate = source.mapToCandidate(item);
        if (!candidate || !candidate.name || !candidate.description) {
          result.mappingErrors++;
          continue;
        }
        if (candidate.externalId && alreadySeenKeys.has(`${source.name}:${candidate.externalId}`)) {
          continue;
        }

        const match = classifyMatch(candidate, existingResources);
        if (match.kind === "duplicate") {
          result.duplicates++;
          continue;
        }

        toInsert.push({
          ...candidate,
          sourceName: source.name,
          matchType: match.kind === "possible_duplicate" ? "possible_duplicate" : "new",
          matchedResourceId: match.kind === "possible_duplicate" ? match.matchedResourceId : null,
          rawPayload: JSON.stringify(item),
        });
        result.queued++;
      }
    } catch (err) {
      result.error = err instanceof Error ? err.message : String(err);
    }

    summary.push(result);
  }

  return { toInsert, summary };
}

if (process.argv[1] && process.argv[1].endsWith("run-ingestion.ts")) {
  const existing: Resource[] = [];

  const goodSource: IngestionSource = {
    name: "fake-good",
    fetchCandidates: async () => [{ name: "Real Tool", description: "A real tool" }, { name: "" }],
    mapToCandidate: (raw) => {
      const r = raw as { name: string; description?: string };
      if (!r.name) return null;
      return { name: r.name, description: r.description ?? "" };
    },
  };

  const brokenSource: IngestionSource = {
    name: "fake-broken",
    fetchCandidates: async () => {
      throw new Error("network error");
    },
    mapToCandidate: () => null,
  };

  runIngestion([goodSource, brokenSource], existing, new Set()).then((result) => {
    console.assert(result.toInsert.length === 1, `expected 1 candidate queued, got ${result.toInsert.length}`);
    console.assert(result.summary[0].fetched === 2, "good source should report 2 fetched");
    console.assert(result.summary[0].mappingErrors === 1, "the empty-name item should count as a mapping error");
    console.assert(result.summary[1].error === "network error", "broken source's failure should be captured, not thrown");
    console.assert(result.summary.length === 2, "both sources should report a summary even though one failed");
    console.log("OK: run-ingestion.ts self-check passed");
  });
}
