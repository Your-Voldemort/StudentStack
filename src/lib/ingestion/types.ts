export type RawCandidate = unknown; // shape is source-specific

export type CandidateFields = {
  externalId?: string;
  name: string;
  tagline?: string | null;
  description: string;
  url?: string | null;
  categorySlug?: string | null;
  tags?: string[];
  region?: "IN" | "Global";
  costType?: "free" | "discount" | "stipend" | "scholarship" | "credits" | "trial";
};

export type IngestionSource = {
  name: string;
  fetchCandidates(): Promise<RawCandidate[]>;
  mapToCandidate(raw: RawCandidate): CandidateFields | null; // null = skip this item (unmappable)
};
