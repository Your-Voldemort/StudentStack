// Empty until a real source is written. Adding one means: write a file in
// this directory implementing IngestionSource (see ../types.ts), then add
// it to this array. No changes needed anywhere else — not the cron route,
// not the dedup logic, not the schema.
import type { IngestionSource } from "../types";

export const SOURCES: IngestionSource[] = [];
