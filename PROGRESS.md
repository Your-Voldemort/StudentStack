# Progress

Read this first at the start of a new session, then the relevant PRD section
for whatever phase comes next.

## Issue #117 — Dialogs render with the light theme on dark pages

- **Cause.** The directory's `--d-*` palette is declared on its `.root`, but
  Radix dialogs render in a portal on `<body>`, outside `.root`. They fell back
  to the global shadcn `--popover` tokens, which are light unless `<html>` has
  `.dark`, so in light mode the dialogs were light panels on the dark directory.
- **Fix.** `directory.module.css` now declares the palette on `.root` and on a
  `.dialog` class, and `.dialog` maps the shadcn tokens that `dialog.tsx` and
  the dialog contents use (`--popover`, `--foreground`, `--muted-foreground`,
  `--border`, `--input`, ...) onto `--d-*`. It also sets `color-scheme` so native
  selects, option lists, and checkboxes match. The card description dialog, the
  eligibility sheet, and the keyboard-shortcuts dialog use it.
- **Judgment calls.** The directory body is dark with either site theme. The
  toggle only sets `.dark`, and nothing sets the `.light` class that
  `directory.module.css` overrides, so in both modes the dialogs match the
  dark directory. `.dialog` is included in that `.light` override, so dialogs
  will follow if the directory ever gets a light mode. `dialog.tsx` itself is
  unchanged. The mobile filter sheet already hard-codes the dark palette, and
  `resource-detail-dialog.tsx` is only used by the unused `resource-row.tsx`,
  so neither was touched. Popovers (bookmark, tag filter) have the same portal
  issue and are left for a follow-up.

## Issue #115 — Unit test coverage above the 80% thresholds

`pnpm test:coverage` now passes all four thresholds (it was about 74%
statements / 72% branches / 65% functions / 76% lines). The thresholds and
excludes in `vitest.config.ts` are unchanged; the gain comes from new tests
for the DB-backed data layer (`src/lib/resources.ts`, `bookmarks.ts`,
`profiles.ts`), the Server Actions in `/my-list`, `/submit`, and
`/onboarding`, the bookmarks, profile, reports, and click route handlers,
the GitHub and Apify ingestion sources, the Supabase server client, and the
report-a-problem control.

- **Fake database.** `src/test/fake-db.ts` stands in for the Drizzle `db`
  export: every query chain is recorded, and awaiting it returns the next
  queued result (or rejects, when an Error is queued). Tests use it through
  `vi.mock("@/db", ...)` with the real schema, so they assert on mapping,
  validation, and fallbacks without Postgres. Judgment call: it doesn't
  interpret the SQL, so a wrong `where` clause still needs an integration or
  E2E check.
- Coverage only counts files that some test imports, so untested modules
  (most pages and admin actions) aren't in the denominator yet. Covering
  them will lower the percentage before it raises it.

## Issue #118 — Past deadlines labelled "today"; search placeholder ignores eligibility

- **Deadline label.** `relativeDeadline()` rounded the distance to whole days,
  so anything that closed less than 12 hours ago came out as "today" under
  "Past deadlines". Passed deadlines now read "closed just now" (first hour),
  "closed N hours ago" (first day), then "closed yesterday" / "closed N days
  ago". Open deadlines keep their old wording. Judgment call: the label uses
  elapsed time rather than calendar days, so it reads the same in every time
  zone and can't disagree between the server render and hydration.
- **One clock per request.** `/deadlines` now reads `Date.now()` once on the
  server and passes it to `DeadlinesList`, so the section, urgency tier, and
  label all use the same instant, and the client's hydration pass prints
  what the server did instead of recomputing with the browser's clock.
- **Dates in UTC.** `formatDeadline()` is pinned to UTC, matching the .ics and
  .rss feeds. Before, a server or browser west of UTC printed curated noon-UTC
  dates correctly but shifted end-of-day UTC ones (ingested deadlines), and
  the existing `Dec 25` test failed when run with `TZ=America/Los_Angeles`.
- **Search placeholder.** With "Only what I'm eligible for" on, both directory
  search inputs say "Search N eligible offers..." with the eligible count. The
  hero input is part of the server-rendered GET form, so `DirectoryClient`
  updates its placeholder from an effect (found via `data-directory-search`)
  and restores the server text when the toggle goes off. The mobile input in
  `DirectoryClient` now shows a count too, for consistency. Same treatment on
  the `/[preset]` pages.

## Issue #116 — Header overflows phone width

- **Cause.** The header row never wraps, and neither the wordmark (`flex: none`)
  nor the nav could shrink, so below about 424px the nav ran past the edge.
  `.barInner` has `overflow: hidden` (for the floating capsule), which hid the
  overflow by clipping the menu button instead of showing a scrollbar.
- **Fix.** At 480px and below, "Add a perk" moves from the header into the
  mobile menu and the wordmark drops to 0.875rem. The wordmark is now the only
  header item that can shrink, so the menu button stays on screen at any width.
  Judgment call: the 480px breakpoint leaves some room above the ~424px where
  the pill stops fitting, in case the fallback font renders wider. Desktop and
  tablet layouts are unchanged.
- **Other sideways scroll at phone widths.** The homepage's 400px card glow is
  now capped at its container's width, and the directory's one-column grid uses
  `minmax(0, 1fr)` (like its 2- and 3-column rules), so a long card no longer
  widens the page to 488px. `e2e/mobile-header.spec.ts` checks 320px and 390px.

## Issue #114 — E2E suite fails on main

`pnpm test:e2e` failed 45 of 55 tests on a checkout without `.env.local`.

- **Selectors.** The directory tests now look for the current heading and
  the "Filters" sidebar (desktop) or filter sheet (mobile). The home-to-
  directory test clicks the footer link, because the header nav collapses
  into a menu on mobile.
- **Proxy without Supabase.** Most of the admin failures were `proxy.ts`
  throwing when it built a Supabase client with no URL or key, which made
  every matched route a 500. It now treats that case as signed out, like
  `/api/bookmarks`: admin routes redirect to `/admin/login`, everything else
  passes through. With env set, nothing changes. Judgment call: this lets the
  auth-guard and login-form tests run everywhere, so only the
  invalid-credentials test needs Supabase and is skipped without it.
  `/submit`, `/my-list`, and `/onboarding` still 500 locally because the
  pages themselves create a client; that's left alone here.
- **Smoke tests** for `/deadlines`, `/compare`, `/api/resources`, and
  `/llms.txt`.
- **Expect timeout** raised to 10s. The directory's filters render after
  hydration, and first visits on a cold server with all projects in parallel
  occasionally passed 5s.
- **Firefox** is kept. On macOS 27, Playwright's Firefox 157 build exits
  with "Could not find profile folder" even when launched by hand with an
  existing profile directory and after a clean reinstall, so it's the
  local browser build, not the config.
## Issue #120 — Flag curated flagship programs whose dates need a refresh

`src/lib/flagship-freshness.ts` is a pure check over
`FLAGSHIP_OPPORTUNITIES`. The admin dashboard lists its result as "Curated
programs to re-check", and the weekly link-health webhook message includes
it. The curated data itself is unchanged.

- **`verifiedOn` is the "already looked at it" marker.** A passed deadline
  is flagged only if the entry wasn't verified after the deadline. Otherwise
  every closed cycle (GSoC closes in March, opens again next March) would sit
  on the list for most of the year. A re-verified entry comes back once its
  `recurrence` month has come round since `verifiedOn`, because the next cycle
  should be announced by then. The same test flags entries with no deadline
  at all.
- **Mentorship programs never need dates.** They're rolling. Entries with no
  `recurrence` have no expected window, so only the 180-day check applies to
  them.
- **The 180-day check applies to every kind, mentorship included.** Amounts,
  eligibility, and links drift too.
- **Dates are compared as UTC calendar days.** A deadline is "passed" from
  the day after it.
- **Notification.** `notifyBrokenLinks` now also sends when there are no newly
  broken links but some curated programs need a re-check. Judgment call: the
  cron is weekly, so this is at most one reminder a week, and the list only
  shrinks when someone edits the file, so a reminder that repeats until then
  is the point. It's still opt-in through `LINK_HEALTH_WEBHOOK_URL` and never
  fails the run. The message shows at most 10 programs; the dashboard has the
  full list.
- **Today the list is empty**, because every entry was verified on
  2026-10-21. Nine entries appear on 1 November (Hacktoberfest and the
  scholarships with 31 October deadlines), and 32 by mid-April 2027. On
  2027-04-20 all 59 pass the 180-day mark together, since they share one
  `verifiedOn`; re-checking entries as they come up spreads that out.

## Issue #42 — Phase 3 wrap-up: admin roles and RLS

Phase 3's features are #33 (bookmarks), #34 (personalization), #84
(eligibility + per-user calendar), and #32 (deadlines, already merged). This
closes the epic's cross-cutting items:

- **Role-based admin.** `verifyAdmin()` used to check that the signed-in email
  equals `ADMIN_EMAIL`. Now an account is an admin when its email is in
  `ADMIN_EMAIL`, which accepts a comma-separated list (a single address still
  works, so nothing changes for existing deployments), or when its
  `profiles.role` is `admin`. Judgment call: the env var stays as the
  bootstrap path because it works before any profile row exists, and roles
  are granted from the CLI (`scripts/grant-admin.ts`) rather than from an
  admin UI, so an attacker who gets into one admin account can't promote
  others. The role lookup only runs when the email isn't allow-listed, and a
  database error fails closed.
- **RLS.** `ingestion_candidates` never had `.enableRLS()`, so the table was
  readable and writable through Supabase's Data API with the public key.
  It's enabled now (`drizzle/0008_admin_role_and_rls.sql`), and
  `src/db/schema-rls.test.ts` fails if any future table forgets it. The app
  still connects as the table owner, which bypasses RLS, so no policies are
  needed. The per-user rules RLS policies would express (only your own
  bookmarks, reviews, and profile) are enforced in the Server Actions, which
  only ever use the user id from the verified session.
- **Auth protection** for `/my-list` and `/onboarding` landed with #33 and #34
  (`proxy.ts` matcher plus a session check in each page), and the `profiles`
  migration landed with #34.

## Issue #79 — Opportunity content: student_resources.json and flagship programs

- **student_resources.json is not committed**, same as `offers.json`: it's a
  third-party export, so the seed uses it when present. Its rows are matched
  against `offers.json` on the product name with deal words stripped
  ("Cursor Pro Student" = "Cursor"; perks only, since for scholarships those
  words are part of the name) or on the claim link's host + path. Host alone
  was too loose (google.com hosts many unrelated offers). Job boards and loan
  marketplaces (Internshala, LetsIntern, Naukri, StuCred, …) are dropped as
  out of scope. Result against the current `offers.json`: 100 net-new and 45
  duplicates. The issue estimated 91 against an older snapshot.
- **The curated file is the reviewed source of truth for dates.** Each of
  the 59 programs was checked on its official site on 2026-10-21. 31 have a
  verified deadline (14 upcoming, 17 from a cycle within the last 12 months,
  so /deadlines can show "Opens again ~<month>"). Older past dates (Khorana
  2024, Fulbright-Nehru 2025) were left out rather than shown as recent. The
  other 28 have no dates because no official date was published; 7 of them
  are mentorship programs, which don't have deadlines. Dropped: Microsoft
  Engage and Google STEP (no longer running), DST WOS-A (no current call),
  and paid mentorship marketplaces (Preplaced, Topmate, MentorCruise,
  Codementor), because no cost type fits a paid service.
- **Dates are stored at 12:00 UTC**, not end of day. End-of-day UTC is
  05:29 IST the next morning, so Indian students would have seen a deadline
  one day late (a passed deadline showed as "today"). Noon UTC keeps the
  calendar date correct from UTC-11 to UTC+11, and errs early rather than
  late.
- **Seed conflict policy**: a non-NULL curated date overwrites the stored
  one, so a new cycle lands on re-seed. A NULL never wipes a date an admin
  entered. Kind, amount, provider, recurrence, and eligibility only backfill
  when NULL (or `perk`), like the other admin-editable fields.
- A curated program updates every row that matches it, because some schemes
  are listed under more than one name (the UGC PG scholarship absorbed the
  Single Girl Child scholarship).

## Issue #78 — Opportunity fields on resources

Scholarships, fellowships, internships, mentorships, and programs now fit
in the same `resources` table as software perks.

- **Schema.** `resources` gains `kind` (`perk` | `scholarship` |
  `fellowship` | `internship` | `mentorship` | `program`, `NOT NULL
  DEFAULT 'perk'`), `opens_at`, `recurrence`, `amount`, `provider`, and
  `eligibility` (`jsonb`, typed as `ResourceEligibility` in
  `src/db/schema.ts`). `ingestion_candidates` gains `kind`, `deadline`,
  `opens_at`, `amount`, and `provider` so ingestion sources can carry
  opportunity data through review.
- **Admin form.** Create/edit covers every new field plus an eligibility
  fieldset. Parsing lives in `src/lib/admin/opportunity-fields.ts`, kept
  free of server-only imports so it is unit tested. Creating a resource
  from a candidate pre-fills the opportunity fields.
- **Mock data** gets one program (Google Summer of Code) so the no-DB
  fallback exercises a non-perk row.

### Judgment calls (#78)

1. **`kind` is separate from category.** Category says what the thing is
   about (development tools, cloud); kind says what sort of offer it is.
   A cloud internship and a cloud credit share a category but not a kind.
2. **Everything new is nullable or defaulted.** The existing 593 rows
   become `kind = 'perk'` with no data migration.
3. **Eligibility is one `jsonb` column, not a set of columns.** Every key
   is optional and an unset key means "open on that axis". Empty
   eligibility is stored as `NULL`, not `{}`.
4. **Migrations start here.** The live database was created with
   `db:push`, so it has no migration history. `drizzle/0000_baseline.sql`
   records the schema as it was on `main`, and `0001_opportunity_fields.sql`
   is the additive change (11 `ADD COLUMN`s). Use `db:push` on the live
   database, or run only `0001` by hand; never run `0000` against it.
5. **Deadline bug fixed on the way.** The edit form's deadline input had
   no default value, so saving any resource silently cleared its deadline.
   It now pre-fills.
## Issue #36 — Compare view

Side-by-side tables for offers that overlap (PRD §8.9).

- **Sets are content, not user-built.** `src/lib/comparisons.ts` holds
  three hand-picked sets (`cloud-credits`, `ai-coding-assistants`,
  `design-tools`): a slug, a name, a description, and an ordered list of
  resource slugs from `offers.json`. More sets get added there.
- **`/compare/[set]`** renders one table: what you get, cost type,
  verification, credit card, duration, region, platforms, and a claim
  link. Unknown sets 404. **`/compare`** lists every set.
- **Links in.** `/r/[slug]` shows "Compare side by side" when the
  resource is in a set; "Compare" is in the header, mobile menu, and
  footer; the sitemap lists every compare page.
- `getResourcesForSlugs()` in `src/lib/resources.ts` fetches approved
  rows only, with a mock-data fallback.

### Judgment calls (#36)

1. **Missing slugs are skipped, not errors.** If an offer is removed or
   unapproved, its set still renders with the rest; an empty set shows
   "No offers in this comparison are live right now."
2. **Rendered per request** (`force-dynamic`), like `/r/[slug]`, so
   admin edits and link-health flips show up immediately.
3. **Shared labels.** The cost, verification, and duration label maps
   moved out of `/r/[slug]` into `src/lib/resource-labels.ts` so both
   pages say the same thing.
4. **Sticky offer column, sideways scroll.** The table keeps a 720px
   minimum width and scrolls horizontally on phones rather than
   collapsing into cards, so the columns stay comparable.
5. **Directory theme tokens.** The table and cards use the directory's
   `--d-*` variables instead of the global `bg-background`/`bg-card`
   tokens, which don't follow the directory's dark palette and left the
   offer column unreadable.
6. **Footer links wrap.** Adding "Compare" pushed the footer nav toward
   the edge at 390px, so footer links now wrap on narrow screens. The
   header nav is unchanged.
## Issue #35 — Community submissions: duplicates and admin notification

The `/submit` flow already existed; this issue tightened it.

- **Stricter duplicate detection.** `urlMatchKey()` in
  `src/lib/submissions.ts` reduces a link to a comparison key: lowercase,
  no `http://`/`https://`, no leading `www.`, no `#fragment`, no trailing
  slash. `isUrlListed()` in `src/lib/resources.ts` applies the same
  normalization in SQL (`regexp_replace` + `rtrim`) against every row,
  approved or pending, so `http://www.Figma.com/education/` is caught as a
  duplicate of `https://figma.com/education`. Query strings are kept on
  purpose: `?ref=` style parameters sometimes point at a different offer.
- **Admin notification.** `notifyNewSubmission()` in
  `src/lib/admin-notify.ts` posts a short message (name, category, link,
  `/admin` review URL) to `SUBMISSIONS_WEBHOOK_URL`, falling back to
  `LINK_HEALTH_WEBHOOK_URL` so one Slack channel can take both. It runs in
  `after()`, so a slow or failing webhook never delays the student's
  response. Unset means no notification; the queue in `/admin` still shows
  the row. The webhook POST is now shared with the link-health summary.
- **Tests.** The `submissions.ts` self-check block (`npx tsx ...`) moved to
  `src/lib/submissions.test.ts` so it runs under `pnpm test`.

### Judgment calls (Issue #35)

- **Two normalizations kept in sync by hand.** The JS key and the SQL
  expression must match. A generated column or a unique index on the
  normalized URL would remove the duplication and also close the
  check-then-insert race; left for later, since admin review catches the
  rare double send.
- **Webhook, not email.** Same reasoning as the link-health summary: no
  email infrastructure yet, and a webhook needs no new dependency.
## Issue #33 — Bookmarks and application tracker

PRD §8.7: save any resource and track where you are with it. Uses the
existing `bookmarks` table (primary key `(user_id, resource_id)`, status
`interested | applied | got_it | rejected`); no schema change.

- **Saving.** The bookmark icon on directory cards, which did nothing
  before, is now `BookmarkButton` (`src/components/bookmarks/`); the same
  button sits next to Claim on `/r/[slug]`. Signed out, it is a link to
  `/my-list?save=<id>`; after sign-in `PendingSave` finishes the save and
  drops the query param. Signed in, one click saves as Interested; a saved
  icon opens a popover with the four status pills, Remove, and a link to
  `/my-list`.
- **`/my-list`.** Saved resources grouped by status, with inline status
  pills and Remove (`useOptimistic`). Each row shows the deadline, the
  offer link, and a note when the offer is expired or broken. Unapproved
  resources are filtered out, so an offer an admin un-approves drops off
  the list. The page checks the session itself; `proxy.ts` only refreshes
  the cookie (`/my-list` added to its matcher).
- **Server side.** `src/lib/bookmarks.ts` (`server-only`) holds the
  queries; `src/app/my-list/actions.ts` has `saveBookmark` /
  `removeBookmark`, which re-check the Supabase session, validate their
  arguments, and only allow approved resources. Saving again upserts on
  the primary key.
- **Sign-in reuse.** `SignInPanel` and the sign-in actions take a `next`
  path (checked with `safeNextPath`), so `/my-list` reuses the `/submit`
  Google and email-link flow. A failed callback returns to whichever page
  started the sign-in.
- "My list" added to the header and mobile nav.

### Judgment calls (Issue #33)

- **Statuses load client-side.** `BookmarksProvider` fetches
  `GET /api/bookmarks` once per page and applies changes optimistically,
  rolling back if the action fails. `/directory` stays a shared,
  non-personalized server render, so the proxy doesn't have to run on
  every directory request. A Route Handler can also write refreshed
  session cookies, which a Server Component render can't.
- **`server-only` in tests.** `vitest.config.ts` aliases `server-only` to
  Next's empty stub so client components that import Server Actions can be
  unit tested.
- **Signed-in flow is unit-tested only.** Without a Supabase project
  locally, the signed-in states and `/my-list` itself weren't exercised in
  a browser; `/my-list` and `/submit` both return 500 when
  `NEXT_PUBLIC_SUPABASE_URL` is unset. `/api/bookmarks` answers
  `signedIn: false` in that case, so cards still render.
## Issue #34 — Branch and year personalization

Students can tell us their branch and year once, and the directory uses
that to rank offers. It is a ranking boost only: every resource stays
visible.

- **Schema.** New `profiles` table keyed by the Supabase auth user id
  (`user_id`, `branch`, `year`, `completed_onboarding`, timestamps), RLS
  enabled like `bookmarks`. Migration `drizzle/0002_profiles.sql`.
- **Onboarding.** `/onboarding` is a two-select form (branch, year) with
  Save and "Skip for now". `/auth/callback` sends a student there after
  sign-in until `completed_onboarding` is true, then on to the original
  `next` path. `/my-list` links to it so the answers can be changed later.
  The proxy matcher now covers `/onboarding`.
- **"For you" sort.** `GET /api/profile` returns
  `{ signedIn, profile: { branch, year } | null }` with `Cache-Control:
  private, no-store`. The directory fetches it client-side; when a branch
  or year is set, the sort menu gains "For you" and selects it by default.
  Scoring lives in `src/lib/personalization.ts` and is unit tested.

### Judgment calls (#34)

1. **Branch tags are derived, not stored.** A resource's branches come from
   its category, its tags, and a short list of flagship tool names
   (MATLAB, SolidWorks, AutoCAD…). Changing the mapping needs no backfill.
2. **Score is small and stable.** +2 for a branch match; for opportunities
   with a `minYear`, +1 if the student has reached it and −1 if not. Ties
   keep the Recommended order, and broken or expired links are still
   demoted below active ones.
3. **Skipping counts as done.** "Skip for now" saves an empty profile with
   `completed_onboarding = true`, so a student who skips isn't asked again
   on every sign-in.
4. **Never blocks sign-in.** If the profile lookup in `/auth/callback`
   fails, the student goes straight to `next`.
5. **The profile is fetched client-side.** The server-rendered directory
   is identical for every visitor; only `/api/profile` is per-user.
## Issue #84 — Accountless eligibility profile and personal calendar

Students can say what they're eligible for without signing up, and the
directory can hide what they can't claim. Signed-in students also get a
private calendar feed of their saved deadlines.

- **Eligibility sheet.** "Set my eligibility" in `/directory` opens a
  dialog (`src/components/directory/eligibility-sheet.tsx`): country,
  state (India only), degree level, year, branch/field, and three "I have"
  checkboxes (college email, GitHub Student Pack, student ID). Saved to
  `localStorage` under `studentstack:eligibility:v1`; the switch state
  under `studentstack:eligible-only:v1`.
- **"Only what I'm eligible for".** The switch narrows the resource pool
  before every filter, facet count, and search runs, so the counts match
  what's shown. Turning it on with no profile opens the sheet first.
  Matching is `isEligible()` in `src/lib/eligibility.ts`: verification
  method, region (India uses the existing `worksInIndia` rule), and the
  structured eligibility from #78.
- **Sync.** `useViewerProfile()` replaces #34's `useProfileSignals()` and
  makes one `/api/profile` call, which now also returns `eligibility`. When
  signed in, a local profile is pushed to `profiles` (server action
  `syncEligibility`); with no local copy, the saved one is pulled down. Field
  and year share #34's `branch`/`year` columns, so onboarding and the sheet
  stay in step. Signed-out students who fill in field or year also get the
  "For you" sort.
- **Personal calendar.** `/my-list` has a "Deadlines in your calendar"
  section with "Get my calendar link", a `webcal:` Subscribe link, and
  "Reset link". The feed is `/u/[token]/deadlines.ics`: the student's
  bookmarked, approved resources that have a deadline, built with the
  existing `buildIcsFeed` under the calendar name "My StudentStack
  deadlines".
- **Schema.** `profiles` gains `eligibility` (`jsonb`) and `calendar_token`
  (`text`, unique). Migration `drizzle/0003_profile_eligibility.sql`.

### Judgment calls (#84)

1. **localStorage first.** The profile works with no account, and the
   local copy wins over the server one when both exist, since it's what
   the student just edited on this device.
2. **A blank answer never excludes.** A rule only removes a resource when
   both the resource and the profile have a value for it. Resources whose
   verification method hasn't been reviewed count as eligible.
3. **The token is the credential.** Calendar apps can't send cookies, so
   the feed URL carries 32 random bytes (base64url). Malformed tokens get a
   404 before any database lookup, responses are `Cache-Control: private`
   and `X-Robots-Tag: noindex`, and "Reset link" issues a new token so an
   old leaked link stops working.
4. **Free-text fields are normalized.** Admins type eligibility fields as
   "CS", "Computer Science", "ECE"…; profiles use the #34 branch codes.
   Both sides map to a shared canonical code before comparing.
## Issue #37 — Student reviews and ratings

PRD §8.11 on top of the existing `reviews` table.

- **Schema** (`drizzle/0004_reviews_unique.sql`): unique index on
  `(resource_id, user_id)` so each student has one review per resource and
  writes are an upsert; `verified_student` boolean (set when the author's
  sign-in email is academic: `.edu`, `.edu.xx`, `.ac.xx`, `.ernet.in`);
  `updated_at`.
- **Writing.** `submitReview` / `deleteMyReview` Server Actions in
  `src/app/reviews/actions.ts` check the Supabase session, validate input
  (integer 1–5, comment up to 1000 characters, `src/lib/review-rules.ts`),
  and only touch the caller's own row. The form on `/r/[slug]` loads the
  student's own review from `GET /api/reviews?resourceId=`
  (`private, no-store`). Signed-out visitors get a sign-in-and-save link.
- **Reading.** `/r/[slug]` shows the aggregate ("4.2 ★ (23 reviews)") and up
  to 50 reviews, sortable by most recent or highest rated (`?reviews=highest`).
  Directory cards show average stars and count via one `GROUP BY` per
  render. JSON-LD `Product` gains `aggregateRating` when reviews exist.

### Judgment calls (#37)

- **Only students who saved the resource (#33) can review it.** It's the
  closest signal we have that they used it. An existing review stays
  editable if the bookmark is later removed.
- **Authors are shown only as "Student".** No names, emails, or ids leave
  the server.
- **RLS rules live in the Server Actions.** The app connects as the table
  owner, so public-read / author-only-write is enforced in code. RLS stays
  enabled with no policies, so the Data API with the publishable key still
  can't reach the table.
- **No "most helpful" sort.** It needs a helpfulness-vote table; left as a
  follow-up to keep the change focused.
## Issue #82 — Public API, llms.txt, and community credits

- **Public read API.** `GET /api/resources` gains `kind` (comma-separated),
  `category` (slug), `region` (`IN` = works in India, `Global` = not
  region-locked, same meaning as the directory facets) and
  `deadline_before` (ISO date: active listings still open now that close on
  or before it). Invalid values return `400` naming the parameter.
  Filtering runs in SQL (`apiFilterConditions` in `src/lib/resources.ts`);
  `matchesApiFilters` in `src/lib/api-filters.ts` is the in-memory twin for
  the mock-data fallback and tests. `GET /api/resources/{slug}` returns one
  approved resource or `404`, using the same resolver as `/r/[slug]`.
- **Caching and limits.** Both endpoints send `Cache-Control: public,
  s-maxage=60, stale-while-revalidate=300` and allow 60 requests/minute per
  client IP (`429` + `Retry-After`, `X-RateLimit-*` headers).
- **API & Agents.** `/api-docs` documents parameters, response shape, date
  format, feeds, and fair-use limits with `curl` examples. `/llms.txt`
  follows llmstxt.org: summary, endpoints, feeds, pages, presets, comparison
  sets, and category slugs from the DB. Both are in the footer; `/api-docs`
  is in the sitemap.
- **Community freshness and credits.** "N students got this" is one
  aggregate `GROUP BY` over `bookmarks` with `status = 'got_it'`, shown on
  cards and `/r/[slug]` when above 0. `/submit` has an optional "Credit me
  as" field (40 characters, plain text, links rejected) stored in
  `resources.contributor_credit` (`drizzle/0005_contributor_credit.sql`);
  approved pages show "Added by …", and admins can edit or clear it.

### Judgment calls (#82)

- **The single-resource handler lives at `src/app/api/resources/[id]/route.ts`.**
  A sibling `[slug]` folder next to the existing `[id]/click` route makes
  Next.js fail every `/api/resources/*` request ("You cannot use different
  slug names for the same dynamic path"). The segment is named `[id]` but
  holds the slug. If #98 lands a different fix first, this can move.
- **The rate limiter is in-memory per function instance.** Enough to slow
  one noisy client; the CDN cache absorbs most repeat traffic. A shared
  store (e.g. Redis) would be needed for a hard global limit.
- **Got-it counts expose numbers only**, never which students.
## Issue #38 — Weekly digest email

PRD §8.12's weekly digest, sent with Resend.

- **Cron.** `/api/cron/weekly-digest` runs Fridays 03:30 UTC (09:00 IST,
  `vercel.json`). It requires `Bearer ${CRON_SECRET}` and refuses to run
  when `CRON_SECRET` is unset, so `Bearer undefined` can't pass. Without
  `RESEND_API_KEY` and `DIGEST_FROM_EMAIL` it returns `{ skipped: … }` and
  sends nothing, so the feature is safe to deploy before Resend is set up.
- **Content** (`src/lib/digest-data.ts`): approved, active resources created
  in the last 7 days, and ones with a deadline in the next 7 days, up to 10
  each. Both empty → no email.
- **Recipients**: every Supabase Auth user with a confirmed email, paged
  through `auth.admin.listUsers` (service-role key), minus
  `profiles.email_digest = false`. On by default, as the issue asked.
  Migration `drizzle/0006_email_digest.sql` adds the column.
- **Email** (`src/lib/digest.ts`): inline-styled HTML plus a plain-text
  part, everything HTML-escaped, no template engine. Sending
  (`src/lib/email.ts`) is plain `fetch` to Resend's `/emails/batch`, 100 per
  request; a failed batch is counted and logged without stopping the run.
- **Unsubscribe.** Links carry an HMAC of the user id (`DIGEST_SECRET`,
  falling back to `CRON_SECRET`), checked with `timingSafeEqual`.
  `/digest/unsubscribe` asks for a button click instead of acting on GET,
  because email link scanners fetch every URL. RFC 8058 `List-Unsubscribe`
  headers point at `POST /api/digest/unsubscribe` for Gmail/Yahoo's own
  button. `/my-list` shows the current setting with an on/off button.
## Issue #83 — Ingestion sources and deadline expiry

`SOURCES` was empty. It now has seven free sources, plus four paid Apify
sources that only turn on when `APIFY_TOKEN` is set. Opportunity Desk is
left to #104.

- **Shared parsers.** `src/lib/ingestion/rss.ts` is a dependency-free RSS 2.0
  parser plus `extractDeadline()`, which prefers a date right after a
  "Deadline / closes / apply by / last date" cue and rejects impossible
  dates (30 February). `src/lib/ingestion/markdown.ts` parses Markdown
  tables and `### [Name](url)` / `- [Name](url) — note` link lists.
- **Sources.** Scholars4Dev and Brabble RSS (hackathons and contests only),
  three open-source program lists on GitHub (`programs.yml` via the new
  `yaml` dependency, plus two Markdown tables), `awesome-edu-perks` (tagged
  `US`), and the GitHub Student Developer Pack page. Apify: scholarships,
  hackathons (Devpost + ETHGlobal), Unstop (scholarships and hackathons
  only, not a job board), and Internshala limited to flagship companies.
  Apify runs cap `maxItems`/`maxResults` because each run is billed to the
  maintainer.
- **Change detection.** `IngestionSource.version()` is optional. GitHub
  sources return the file's latest commit SHA (`GITHUB_TOKEN` raises the
  rate limit); an unchanged SHA skips the download. State lives in the new
  `ingestion_sources` table (`drizzle/0007_ingestion_sources.sql`), which
  #40 builds source monitoring on. A failed run keeps the old fingerprint so
  the next run retries.
- **Deadlines.** `runIngestion` drops candidates whose deadline already
  passed. The link-health cron now starts with `deadlineRollover()`: no
  `recurrence` → `expired`; with a `recurrence` → `deadline = null`, keeping
  the "Opens again" label. This runs before link checks so newly expired
  rows aren't fetched.
- **Judgment calls.** The ingest cron moved to Mondays and Thursdays, since
  opportunity feeds move faster than perks. Both existing crons now reject
  requests when `CRON_SECRET` is unset (`Bearer undefined` used to pass).
  The inline `run-ingestion.ts` self-check moved to vitest.
## Issue #40 — Completing the ingestion pipeline

- **Dedup** (`src/lib/ingestion/classify-match.ts`): exact-URL matching now uses
  `urlMatchKey()` from `/submit`'s duplicate check, so link variants of a listed
  offer are dropped. Identical normalized names on the same host are also
  dropped. A different page on the same host counts as a possible duplicate,
  except on shared hosts (github.com, devpost.com, unstop.com, …) where a
  shared host says nothing about whether two offers are the same.
  `runIngestion` also drops candidates whose link is already pending from any
  source, or queued earlier in the same run.
- **Vendor page watching** (`src/lib/ingestion/sources/vendor-watch.ts`):
  judgment call. Cloud and tool vendors don't publish feeds, and scraping their
  marketing pages into new rows would mostly re-create offers we already list.
  So each watched page is fingerprinted by its offer sentences only (money,
  credits, plans, durations), and a changed fingerprint queues one candidate
  next to the existing resource (`updateOf`). The first run only records a
  baseline (`baselineFirstRun`), so turning this on doesn't flood the queue.
  Six pages are watched. Fingerprints were checked against live pages and
  are stable across fetches; lines with trace ids, long tokens, or times are
  excluded so per-request noise can't trigger a review. Oracle Cloud, Canva,
  and Autodesk return 403 to automated requests and JetBrains renders its
  offer client-side, so those aren't watched.
- **Source health** reads the `ingestion_sources` table added in #83; "stale"
  means no successful run in 14 days.
- Sources are now built per cron run (`getSources()`), because the vendor
  watcher caches its page fetch for one run and a module-level array would
  have kept that cache across runs on a warm instance.

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
