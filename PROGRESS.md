# Progress

Read this first at the start of a new session, then the relevant PRD section
for whatever phase comes next.

## Status: Phase 1 (PRD §13) — done, homepage added

`pnpm dev` → `/directory` renders all 593 seeded resources with combinable
category/tag/region/cost-type filters + Fuse.js fuzzy search, all reflected
in the URL query string. `/` is a real homepage now (was the default
create-next-app template) — hero + live category grid + 3-step explainer,
all funneling to `/directory`. Category tiles link to
`/directory?category=<slug>`, reusing the existing filter param. Added
`getCategoriesWithCounts()` / `getResourceCount()` to `src/lib/resources.ts`
for the real numbers on that page. Homepage-only palette/display font
(`--color-paper/ink/navy/marigold/sage/line`, `--font-display` → Space Mono)
added to `globals.css`/`layout.tsx`; `/directory`'s shadcn components are
untouched and still use the default theme.

### What's built

- Next.js 16 (App Router, Turbopack), TypeScript strict, Tailwind v4
  (CSS-first `@theme`, confirmed — no `tailwind.config.js`), shadcn/ui
  (radix base, Nova preset).
- Drizzle schema at `src/db/schema.ts` — canonical, matches PRD §7, PostgreSQL
  dialect. Not connected to anything yet (no live Supabase/Neon project).
- `src/db/schema.sqlite.ts` + `src/db/index.ts` — local-dev stand-in DB
  (SQLite via better-sqlite3), same table/column shape, dialect-appropriate
  types. This is what the app actually reads from right now.
- `scripts/normalize-data.ts` — reads `offers.json`, exports `normalizeOffers()`.
  Re-runnable, has an inline self-check (`npx tsx scripts/normalize-data.ts`).
- `scripts/seed.ts` — `pnpm db:seed`, clears + reloads `categories`/`resources`
  from the normalizer output. Re-run any time `offers.json` changes.
- `/directory` — server-fetched resource grid + client-side filter/search
  (`src/components/directory/`).

### Judgment calls (PRD §4.3 asked these to be logged here)

1. **Local dev DB is SQLite, not Postgres.** No Docker daemon or Supabase
   project available in this environment. `src/db/schema.sqlite.ts` mirrors
   `schema.ts` field-for-field (arrays → JSON text, enums → text union,
   uuid → text, boolean/timestamp → integer modes). When a real
   `DATABASE_URL` exists: point `drizzle.config.ts` and `src/db/index.ts` at
   `schema.ts` (Postgres dialect) and drop the SQLite files.

2. **`category_sub` becomes a tag, not a second schema level.** `resources`
   keeps the PRD's flat `categoryId`. Every offer's `category_sub` (e.g.
   "AI Assistants", "DevOps") is merged into its `tags` array (deduped
   case-insensitively against the existing `tag1-3`-derived `tags`). Avoids
   a parent/child `categories` table and the admin UI that would need to
   manage it, for zero loss of filterability — subcategories already work
   as tag filters.

3. **`costType` enum extended with `'trial'`.** PRD enum was
   `free | discount | stipend | scholarship | credits`. `offers.json`'s
   `tag2: "Trial"` (13 rows) is a genuinely distinct concept — time-boxed
   access, not a permanent discount — so it got its own value instead of
   being force-mapped into `discount`.

4. **Missing `claim_url` (42 rows): added `hasStaticClaimUrl: boolean` and
   made `url` nullable**, instead of a `status: 'needs_review'` state (the
   PRD's `status` enum is about link health, not claim-flow shape — reusing
   it would conflate two different concerns). The card renders "Varies by
   region" in place of the Claim CTA when `hasStaticClaimUrl` is false.

5. **`region` collapses everything non-India into `'Global'`.** Raw data has
   `US`, `UK`, `Canada`, `Limited Countries`, etc. — PRD's region enum is
   only `IN | Global`. Finer-grained region filtering is a schema change for
   later if it turns out to matter (PRD §12 flags this as an open product
   question).

6. **`extra_info.important_notes`/`disclaimer` get folded into `description`**
   (appended as `"\n\nNote: ..."`), since the PRD schema has no separate
   notes field for them and they're genuinely useful context (e.g. "requires
   GitHub Student Pack approval").

7. **No `student_resources.json`** was present in the repo — proceeded with
   `offers.json` alone, per the brief's fallback instruction. Dedup-across-
   sources logic (PRD §4.3) wasn't needed; add it if that second file shows
   up later.

8. **Deadline column/view**: left null and unbuilt, per brief §4.3 — no
   deadline data exists in `offers.json`.

9. **Freshness badge**: every seeded row has `lastVerifiedAt = null` (no
   link-health cron yet — that's Phase 2, PRD §8.6), so every card shows
   "Not yet verified" per the brief's explicit allowance.

10. **No intermediate JSON artifact between normalize and seed.**
    `scripts/normalize-data.ts` exports `normalizeOffers()` as a function;
    `seed.ts` imports and calls it directly rather than writing/reading a
    `normalized-resources.json` file. One source of truth, still re-runnable.

### Known gaps / not built (correctly out of scope for Phase 1)

Accounts, bookmarks, admin CRUD, link-health cron, `/deadlines`,
`/compare`, submissions — all later phases per PRD §13.

## Next

**Phase 2** (PRD §13): point at a real Postgres (Supabase or Neon), swap
`src/db/index.ts` over to `schema.ts`, build `/admin` CRUD (§8.5) and the
link-health cron (§8.6).
