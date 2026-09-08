# Progress

Read this first at the start of a new session, then the relevant PRD section
for whatever phase comes next.

## Status: Phase 2 (PRD §13) — done

Postgres cutover, admin CRUD, and the link-health cron are all live against
a real Supabase project — the user's own (created directly on
supabase.com), not the Vercel-provisioned one. The app originally ran on a
`vercel integration add supabase` resource; that was fully migrated off and
deleted (`vercel integration resource remove supabase-yellow-engine
--disconnect-all`) once the user's own project had the schema, all 593
resources, and the admin user recreated on it. All five Supabase/Postgres
env vars (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `POSTGRES_URL`, `POSTGRES_URL_NON_POOLING`) are
now plain Vercel env vars (not integration-managed) across all three
environments.

**Gotcha hit during the migration:** the project's direct connection host
(`db.<ref>.supabase.co:5432`) is IPv6-only unless the IPv4 add-on is
purchased, so `drizzle-kit push` couldn't connect through it. Fixed by
using the Supavisor pooler host in **session mode** (port 5432,
`aws-0-<region>.pooler.supabase.com`, username `postgres.<project-ref>`)
for `POSTGRES_URL_NON_POOLING` instead of the raw direct host — same
pooler host as `POSTGRES_URL`, just a different port/mode. See
`.env.example`.

### What's built (Phase 2)

- **Real Postgres.** `src/db/index.ts` now uses `postgres-js` +
  `drizzle-orm/postgres-js` against Supabase's pooled `POSTGRES_URL`
  (`prepare: false` — Supavisor transaction mode doesn't support prepared
  statements). `drizzle-kit push`/`db:seed` use `POSTGRES_URL_NON_POOLING`
  and load `.env.local` via `dotenv-cli` (neither `drizzle-kit` nor `tsx`
  auto-load it). `src/db/schema.sqlite.ts`, `better-sqlite3`, and
  `local.db*` are gone — Postgres is the only path now. `src/lib/resources.ts`
  and both pages that call it are `async` (postgres-js has no
  `.all()`/`.run()`). Re-seeded all 593 resources with a single bulk insert
  per table instead of 593 sequential round trips.
- **Supabase Auth, single-admin gate (§8.5's "auth-gated, single admin
  role").** `src/lib/supabase/{server,client}.ts` are the standard
  `@supabase/ssr` clients. `src/proxy.ts` — Next.js 16 renamed
  `middleware.ts` to `proxy.ts` — refreshes the session and does an
  optimistic redirect for `/admin/*`. `src/lib/admin/auth.ts`'s
  `verifyAdmin()` is the real gate: authenticated **and** `email ===
  process.env.ADMIN_EMAIL`, called in the admin layout and independently in
  every Server Action (Next.js's own guidance: proxy/layout checks alone
  aren't sufficient — Server Functions are reachable directly). One admin
  user exists, bootstrapped via `scripts/create-admin.ts` (service-role
  key, never client-side).
- **Admin CRUD (§8.5).** `/admin` (route group `(dashboard)`, kept separate
  from `/admin/login` so the gated layout doesn't redirect-loop on the
  login page itself) lists all resources with inline status edit — a
  status change hits the DB directly and is visible on `/directory` on the
  very next request, since neither page has any caching (`cacheComponents`
  is still off; see the judgment call below). `/admin/resources/new` and
  `/admin/resources/[id]` cover the PRD's required create fields
  (name/url/category/cost type/description) plus the optional ones
  (tags/region/deadline). Verified live in a real browser: login → dashboard
  → status toggle → directory badge appears → create → appears on
  `/directory` → delete → gone.
- **Link-health cron (§8.6).** `src/lib/link-health.ts` has the pure
  classify/concurrency logic (self-checked: `npx tsx src/lib/link-health.ts`)
  separate from `src/app/api/cron/link-health/route.ts`'s HEAD-check
  (GET fallback on 405/501), 25-way concurrency pool, and `CRON_SECRET`
  bearer check. `vercel.json` schedules it weekly (Monday 03:00 UTC — Hobby
  plan only allows once/day). Ran live against all 593 seeded resources:
  551 checkable (the other 42 have no static claim URL), completed in
  ~2m15s against the 270s budget, found 86 genuinely broken links — which
  immediately show the "⚠ Link may be down" badge on `/directory`.

### Judgment calls (Phase 2)

11. **Admin auth is a single allow-listed email, not full Phase 3
    accounts.** §8.5 asks for "auth-gated, single admin role" as a Phase 2
    P0, but real user accounts are Phase 3. Built the minimum that
    satisfies §8.5 on top of the Supabase Auth infra Phase 3 needs anyway
    (`src/lib/supabase/`) — Phase 3 extends this rather than starting from
    scratch. `ADMIN_EMAIL` is the allow-list; `scripts/create-admin.ts`
    bootstraps that one user.
- **cacheComponents stays off.** The PRD tech-stack table calls it "a
    stable default behavior, not an experimental flag," which is true of
    the *flag naming* (no more `experimental.ppr`) but not of the setting
    itself — `next.config.ts` still needs `cacheComponents: true`, and it
    was never set. Left it off: turning it on would force `use cache`
    boundaries and `<Suspense>`-wrapped auth reads across the app for no
    concrete Phase 2 requirement. This is also why admin auth could use
    plain `cookies()` reads instead of the `use cache: private` pattern.
- **Link-health "admin gets a summary notification" (§8.6) is the
    dashboard's status-count line, not an email.** No email provider is
    wired up yet (that's Phase 5's digest email, §8.12); building one just
    for this would be scope creep. `/admin` already computes
    active/broken/expired counts and `max(last_verified_at)` from existing
    columns — no new table needed.
- **`getCategories()`/`getAllResources()` gained `id`/`categoryId`** so the
    admin resource form's category `<select>` can use the real numeric FK
    directly instead of a slug round-trip.
- **`/` and `/directory` are `export const dynamic = "force-dynamic"`.**
    Neither page uses a dynamic API, so `next build` was silently
    prerendering both as fully static — verified with a real
    `next build && next start`: `revalidatePath` correctly marked the page
    stale (confirmed via `x-nextjs-cache: MISS`) and re-rendered it, but the
    regenerated output still matched the build-time snapshot rather than
    the live DB (checked by comparing against a same-process debug query
    that *did* see the current data). `force-dynamic` sidesteps that
    entirely — the PRD's "reflects within one page load" requirement
    (§8.5) needs a hard guarantee, not a caching layer whose on-demand
    invalidation didn't reliably re-run the query in self-hosted mode.

## Status: Phase 1 (PRD §13) — done, homepage added

`pnpm dev` → `/directory` renders all 593 seeded resources with combinable
category/tag/region/cost-type filters + Fuse.js fuzzy search, all reflected
in the URL query string. `/` is a real homepage now (was the default
create-next-app template) — hero + live category grid + 3-step explainer,
all funneling to `/directory`. Category tiles link to
`/directory?category=<slug>`, reusing the existing filter param. Added
`getCategoriesWithCounts()` / `getResourceCount()` to `src/lib/resources.ts`
for the real numbers on that page.

Homepage went through a second, `/impeccable`-driven visual pass since then:
`PRODUCT.md` and `DESIGN.md` now exist at the repo root (register: brand;
personality: scrappy & resourceful) and should be read before any future
homepage/marketing work. The visual system moved from an "index card /
Space Mono" concept to "The Photocopied Flyer" — photocopy-grey + one
committed safety-orange accent, Big Shoulders (display) + Public Sans
(body) instead of Space Mono (Space Mono, IBM Plex Mono, and Inter are on
impeccable's font reflex-reject list). The category grid became a
ledger/manifest list (dotted-leader rows with real counts) instead of
identical bordered cards — the previous grid was a textbook "identical card
grid" tell. Tokens live in `src/app/globals.css` under
`--color-bg/panel/ink/ink-muted/line/orange/orange-deep`, homepage-scoped
same as before at that point.
`.impeccable/live/config.json` is configured for live-mode iteration
(`src/app/layout.tsx`, Next.js App Router, no CSP to patch).

`/directory` then got the same `/impeccable` treatment (register: product,
per `reference/product.md` — it's a filter/search tool, not a marketing
surface). The shadcn `:root` tokens in `globals.css` are now retargeted to
the same palette as the homepage (oklch equivalents of the hex values
above; `--primary` = the orange accent, `--radius` shrunk from 0.625rem to
0.3rem) so the two pages finally share one visual identity — previously
`/directory` was left on the stock black/white Nova theme. `.dark` is
intentionally untouched (no dark-mode toggle exists anywhere in the app,
so it's unreachable). Because resource-card.tsx and the filter controls
already used semantic Tailwind/shadcn classes (`bg-primary`,
`text-muted-foreground`, etc.) rather than hardcoded colors, this
retargeting needed no component-level color changes.

Also, three real fixes, not just a reskin:
- `src/app/directory/page.tsx`'s `<main>` was a direct flex child of
  `<body>` (`flex flex-col`, from `layout.tsx`) with `mx-auto` on itself.
  Per the flexbox spec, an auto margin on the cross axis disables stretch,
  so `main` was falling back to shrink-to-fit sizing instead of filling
  `max-w-6xl` — the entire directory page (filter bar *and* the resource
  grid) has never reliably used its full available width. Fixed by adding
  `w-full` alongside `max-w-6xl`. (The homepage doesn't have this bug: its
  root wrapper, the actual direct child of `body`, has no `mx-auto` of its
  own — centering happens one level deeper.)
- The filter bar's five controls (search input + 3 selects + tag filter)
  had fixed widths that summed to more than the container even after the
  width fix, so one control reliably wrapped onto its own line at almost
  every viewport width ≥640px. Narrowed each control
  (`directory-client.tsx`, `tag-filter.tsx`) so all five sit on one row
  with margin to spare.
- The empty state and the "clear filters" action were text-only. Added a
  real `Button` in the empty state, and a unified, removable filter-chip
  row (category/region/cost-type/tags all shown as one consistent set of
  chips, `Region:`/`Cost:` prefixed to disambiguate from tag values,
  e.g. a tag literally named "Free") above the results — `TagFilter` no
  longer renders its own separate chip list, to avoid showing tags twice.

A `DirectorySkeleton` component now backs the `Suspense` fallback in
`directory/page.tsx` (was `null`) for the brief CSR-bailout flash caused by
`useSearchParams`.

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

**Phase 3** (PRD §13): real user accounts on top of the Supabase Auth
plumbing already in place (`src/lib/supabase/`, `src/proxy.ts`) —
bookmarks/tracker (§8.7), `/deadlines` (§8.4), personalization (§8.8).
Phase 3 extends the existing auth setup rather than introducing a new one;
watch for the single-admin-email check in `verifyAdmin()` needing to become
a real role check once regular users exist.
