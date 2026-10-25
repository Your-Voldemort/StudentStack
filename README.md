<div align="center">

# StudentStack

**Free tools, discounts, credits, and opportunities for students — filtered to what you can actually use.**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61dafb?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06b6d4?logo=tailwindcss)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres-3ecf8e?logo=supabase)](https://supabase.com/)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle_ORM-0.45-c5f74f?logo=drizzle)](https://orm.drizzle.team/)
[![Vercel](https://img.shields.io/badge/Deployed_on-Vercel-000?logo=vercel)](https://vercel.com/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

[Features](#features) • [Architecture](#architecture) • [Getting Started](#getting-started) • [Using the Directory](#using-the-directory) • [Admin Dashboard](#admin-dashboard) • [Data Workflow](#data-workflow)

</div>

---

StudentStack is a student-first resource directory for finding useful software, cloud credits, certifications, and other student offers — without digging through stale, single-category lists. The seeded dataset contains **593 resources across 15 categories**, with filters for category, region, cost type, and tags. Search is typo-tolerant, filters are reflected in the URL, and every resource carries a link-health status that a weekly cron job keeps current.

> [!NOTE]
> StudentStack runs on **your own Supabase (Postgres) project**. See [Getting Started](#getting-started) for how to provision one and wire up the environment variables.

---

## Features

- **Searchable directory** with typo-tolerant matching powered by [Fuse.js](https://www.fusejs.io/).
- **Composable filters** for category, region, cost type, and tags — all reflected as shareable query parameters (`q`, `category`, `region`, `cost`, `tags`).
- **Automated link-health checks** — a weekly Vercel Cron job re-verifies every claimable URL and flips resources between `active`/`broken`, so cards never point at a dead link for long.
- **Claim-aware cards** that distinguish direct claim links from offers that vary by region and have no single static URL.
- **Live homepage counts** for resources and categories, read straight from the database at request time.
- **Minimal admin dashboard** (single allow-listed account, gated by Supabase Auth) for creating, editing, and retiring resources without touching the database directly.
- **Responsive UI** designed for students browsing primarily on mobile.
- **Opportunities alongside perks** — each resource has a `kind` (`perk`, `scholarship`, `fellowship`, `internship`, `mentorship`, `program`) plus optional opens-at date, deadline, recurrence, amount, provider, and structured eligibility, all editable in `/admin`.
- **Student submission flow** at `/submit` (Google or email-link sign-in via Supabase Auth); submissions stay hidden until approved from the review queue in `/admin`.
- **Side-by-side comparisons** at `/compare` — hand-picked sets of overlapping offers (cloud credits, AI coding assistants, design tools) shown as one table: what you get, cost type, verification, credit card, duration, region, platforms, and claim link. Resource pages link to every set they appear in.
- **Duplicate-aware submissions** — `/submit` rejects a link that is already listed or waiting for review, even when it differs only by `http`/`https`, a leading `www.`, letter case, a `#fragment`, or a trailing slash. An optional webhook (`SUBMISSIONS_WEBHOOK_URL`) pings the admin when a new submission arrives.
- **Bookmarks and application tracker** — the bookmark icon on every directory card and on `/r/[slug]` saves an offer to `/my-list`, where students track each one as Interested, Applied, Got it, or Rejected. Signed-out students are sent to sign in (same Google / email-link flow as `/submit`) and the offer is saved when they come back.
- **"For you" sort** — signed-in students can set an optional branch and year at `/onboarding` (offered once after first sign-in, skippable, and linked from `/my-list`). The directory then defaults to a "For you" sort that ranks matching offers first; nothing is hidden.
- **"Only what I'm eligible for"** — an accountless eligibility profile (country, state, degree level, year, field, and whether you have a college email, the GitHub Student Pack, or a student ID) set from the directory and saved in the browser. A toggle then hides offers you can't claim. Signed-in students get the profile synced across devices.
- **Personal deadlines calendar** — signed-in students can get a private `/u/<token>/deadlines.ics` link from `/my-list` that subscribes Google Calendar, Apple Calendar, or Outlook to the deadlines of their saved offers. The link can be reset at any time.
- **Student reviews and ratings** on each `/r/[slug]` page: students who saved an offer can leave a 1–5 star rating and an optional comment (one review per student per offer, editable). Reviews show as "Student" with a "Verified student" badge for academic emails, sort by most recent, highest rated, or most helpful, and directory cards show the average and count. Signed-in students can mark other students' reviews as "Helpful" (not their own); everyone sees the count.
- **Public read API and agent docs**: `GET /api/resources` (filters for `kind`, `category`, `region`, `deadline_before`) and `GET /api/resources/{slug}`, cached at the CDN and rate limited per client. `/api-docs` documents them with `curl` examples and `/llms.txt` gives AI agents a map of the site; both are linked from the footer.
- **Community credits**: cards and resource pages show "N students got this" (an aggregate count only), and `/submit` has an optional "Credit me as" field shown as "Added by …" once a submission is approved.
- **Weekly digest email** sent with [Resend](https://resend.com/) every Friday: offers added that week plus deadlines closing in the next 7 days. On by default for signed-in students, with a signed one-click unsubscribe link and an on/off toggle on `/my-list`.
- **Automated ingestion** twice a week (Mondays and Thursdays) from RSS feeds, curated GitHub lists, the GitHub Student Developer Pack page, and optional Apify scrapers. New finds land in the `/admin/ingestion` review queue; opportunities whose deadline has already passed are never queued.

---

## Architecture

```text
offers.json → scripts/normalize-data.ts → scripts/seed.ts → Supabase Postgres → Next.js
                                                                      ↑
                                                     /api/cron/link-health (weekly)
```

| Layer | Technology |
|-------|------------|
| **Frontend/Backend** | [Next.js](https://nextjs.org/) 16 (App Router, Turbopack), [React](https://react.dev/) 19, TypeScript |
| **Styling** | [Tailwind CSS](https://tailwindcss.com/) 4 (CSS-first `@theme`), Radix primitives, shadcn-style UI components |
| **Database** | Postgres via your own [Supabase](https://supabase.com/) project, queried with [Drizzle ORM](https://orm.drizzle.team/) |
| **Auth** | Supabase Auth, gating `/admin` behind the `ADMIN_EMAIL` allow-list or an `admin` role on the user's profile |
| **Scheduled Jobs** | [Vercel Cron](https://vercel.com/docs/cron-jobs) triggers `/api/cron/link-health` every Monday 03:00 UTC |
| **Email** | [Resend](https://resend.com/) HTTP API sends the weekly digest from `/api/cron/weekly-digest` every Friday 03:30 UTC |
| **Ingestion** | Vercel Cron triggers `/api/cron/ingest-resources` every Monday and Thursday 04:00 UTC |
| **Client-Side Search** | [Fuse.js](https://www.fusejs.io/) fuzzy-matches across name, offer, description, and tags |

```text
src/
├── app/
│   ├── page.tsx                           # Homepage (Student Pass design)
│   ├── directory/page.tsx                 # Directory route with search & filters
│   ├── admin/                             # Login + dashboard (Supabase Auth-gated)
│   ├── submit/                            # Student submission flow
│   ├── compare/                           # /compare index and /compare/[set] side-by-side tables
│   ├── my-list/                           # Saved offers + application tracker (sign-in required)
│   ├── api/bookmarks/route.ts             # Signed-in student's bookmark statuses (used by cards)
│   ├── onboarding/                        # Optional branch + year step for the "For you" sort
│   ├── api/profile/route.ts               # Signed-in student's branch/year (GET)
│   ├── u/[token]/deadlines.ics/route.ts   # Per-user calendar feed of saved deadlines (token in URL)
│   ├── reviews/actions.ts                 # Submit/delete review + helpful vote Server Actions
│   ├── api/reviews/route.ts               # Signed-in student's own review + whether they can review
│   ├── api/reviews/votes/route.ts         # Signed-in student's helpful votes on a resource's reviews
│   ├── api-docs/page.tsx                  # Public API & Agents documentation
│   ├── llms.txt/route.ts                  # llms.txt for AI agents
│   ├── api/resources/route.ts             # Public list API with filters, cache, rate limit
│   ├── api/resources/[id]/route.ts        # Public single-resource API (segment holds the slug)
│   └── api/cron/link-health/route.ts      # Weekly link-health check
│   ├── api/cron/weekly-digest/route.ts    # Weekly digest email (Fridays)
│   ├── api/digest/unsubscribe/route.ts    # RFC 8058 one-click unsubscribe (POST)
│   └── digest/unsubscribe/page.tsx        # Unsubscribe confirmation page
├── components/
│   ├── directory/                         # Search, filters, cards, loading UI
│   ├── admin/                             # Resource create/edit form
│   ├── home/                              # Student Pass card, category wallet
│   ├── reviews/                           # Star rating display, review form, helpful votes
│   └── ui/                                # Reusable interface primitives
├── db/
│   ├── index.ts                           # Postgres/Drizzle connection
│   └── schema.ts                          # Drizzle schema (categories, resources, bookmarks, reviews, review votes, click events)
├── lib/
│   ├── resources.ts                       # Resource and category queries
│   ├── comparisons.ts                     # Hand-picked comparison sets for /compare
│   ├── resource-labels.ts                 # Shared cost, verification, and duration labels
│   ├── link-health.ts                     # URL health-check logic
│   ├── flagship-freshness.ts              # Which curated flagship programs need their dates re-checked
│   ├── reviews.ts                         # Review queries and rating aggregates
│   ├── review-rules.ts                    # Review + vote validation, sort parsing, academic-email check, rating format
│   ├── api-filters.ts                     # Public API filter parsing and matching
│   ├── rate-limit.ts                      # In-memory per-instance API rate limiter
│   ├── llms-txt.ts                        # Builds the /llms.txt body
│   ├── digest.ts                          # Digest email body and signed unsubscribe links
│   ├── digest-data.ts                     # Digest content and recipient queries
│   ├── email.ts                           # Resend batch sending
│   ├── admin/auth.ts                      # Admin session verification
│   ├── supabase/                          # Supabase client helpers (browser + server)
│   └── ingestion/                         # Resource ingestion pipeline
│       ├── sources/                       # RSS, GitHub list, GitHub Pack page, and Apify sources
│       ├── rss.ts                         # RSS parser and deadline extraction
│       └── markdown.ts                    # Markdown table and link-list parsers
└── proxy.ts                               # Next.js 16 middleware equivalent — refreshes admin sessions

scripts/
├── normalize-data.ts                      # Raw offers.json → normalized rows
├── seed.ts                                # Reload categories/resources into Postgres
├── student-resources.ts                   # student_resources.json → net-new rows (deduplicated against offers.json)
├── flagship.ts                            # Overlays the curated flagship opportunities onto the dataset
└── create-admin.ts                        # One-time bootstrap of the admin Supabase Auth user

drizzle/
├── 0000_baseline.sql                      # Schema as it was before migrations were tracked
├── 0001_opportunity_fields.sql            # Opportunity columns on resources and ingestion candidates
└── meta/                                  # drizzle-kit snapshots and journal
```

Product and design decisions are documented in [PRODUCT.md](PRODUCT.md), [DESIGN.md](DESIGN.md), and [student-resources-prd.md](student-resources-prd.md); implementation notes and judgment calls are logged in [PROGRESS.md](PROGRESS.md).

---

## Getting Started

### Prerequisites

- Node.js LTS
- [pnpm](https://pnpm.io/installation) 11 or later
- A [Supabase](https://supabase.com/) project (free tier is enough)

### 1. Provision Supabase

Create a project, then grab the connection strings and API keys from **Project Settings → Database/API**.

> [!IMPORTANT]
> Use the **Supavisor pooler** host for both connection strings, just on different ports — the direct `db.<ref>.supabase.co` host is IPv6-only unless you've purchased the IPv4 add-on, and migrations will fail to connect through it.

### 2. Configure Environment Variables

```bash
cp .env.example .env.local
```

```env
POSTGRES_URL=              # Supavisor pooler, Transaction mode (port 6543) — app runtime
POSTGRES_URL_NON_POOLING=  # Supavisor pooler, Session mode (port 5432) — drizzle-kit migrations
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY= # server-only, used by scripts/create-admin.ts
ADMIN_EMAIL=               # account(s) allowed into /admin, comma-separated
CRON_SECRET=               # Vercel Cron sends this as a Bearer token
SUBMISSIONS_WEBHOOK_URL=   # optional: Slack/JSON webhook pinged on each new /submit entry; falls back to LINK_HEALTH_WEBHOOK_URL
RESEND_API_KEY=            # optional: Resend API key for the weekly digest (set by the Vercel Resend integration)
DIGEST_FROM_EMAIL=         # optional: verified digest sender, e.g. "StudentStack <digest@yourdomain>"
DIGEST_SECRET=             # optional: signs digest unsubscribe links (defaults to CRON_SECRET)
APIFY_TOKEN=               # optional: enables the paid Apify ingestion sources (billed per run to your Apify account)
GITHUB_TOKEN=              # optional: raises the GitHub API rate limit for ingestion change detection
```

### 3. Install, Migrate, and Seed

```bash
pnpm install
pnpm db:push
pnpm db:seed
```

> [!IMPORTANT]
> `offers.json` is intentionally ignored by Git. A fresh clone needs the raw seed input available at the repository root before running `pnpm db:seed`. The bundled dataset produces 593 resources across 15 categories.

### 4. (Optional) Create the Admin Account

```bash
pnpm dotenv -e .env.local -- tsx scripts/create-admin.ts you@example.com <password>
```

The email must be listed in `ADMIN_EMAIL`. To give an existing account admin access without changing env vars, run `pnpm dotenv -e .env.local -- tsx scripts/grant-admin.ts <email>` (add `--revoke` to remove it); the person needs to have signed in once.

### 5. Run the App

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Using the Directory

1. Open the homepage and choose **Browse the directory**.
2. Search by resource name, offer, description, or tag — small spelling mistakes are supported.
3. Combine category, region, cost, and tag filters as needed.
4. Use the filter chips to remove individual selections, or choose **Clear all**.
5. Open a resource's official claim link when one is available. Region-dependent offers are labelled "Varies by region" when no single static link exists.

Signed-in students who have set a branch or year at `/onboarding` get an extra **For you** option in the sort menu, selected by default. It moves offers tagged for their branch (for example MATLAB and KiCad for ECE, Figma and Canva for Design) and opportunities whose minimum year of study they have reached to the top, and keeps everything else in the usual order below.
Above the results, **Set my eligibility** opens a short form (no account needed). Once it's saved, the **Only what I'm eligible for** switch hides offers that need a verification method you don't have, aren't available in your country, or have eligibility rules (state, degree level, minimum year, field) that rule you out. A blank answer never hides anything. The profile and the switch are stored in `localStorage`; when you're signed in they're also saved to your account, so a new device picks them up.

Filter state lives in the URL, so any search can be shared or bookmarked as-is:

```text
/directory?q=github&category=development-tools&region=Global&cost=free
```

To weigh similar offers against each other, open **Compare** in the header (or **Compare side by side** on a resource page). Each set at `/compare/<set>` lists its offers in one table; on a phone the offer column stays pinned while the table scrolls sideways. Sets are defined in [`src/lib/comparisons.ts`](src/lib/comparisons.ts) as an ordered list of resource slugs; a slug with no approved resource is skipped, so a set keeps working if an offer is removed. Add a new set there to publish it — it is picked up by the index, the resource pages, and the sitemap.

---

## Admin Dashboard

`/admin` is a minimal dashboard for managing resources without direct database access — create, edit, flip status (`active`/`expired`/`broken`), and delete. It's gated by Supabase Auth to accounts listed in `ADMIN_EMAIL` (comma-separated) or whose profile has the `admin` role (see `scripts/grant-admin.ts`); every Server Action re-verifies that check independently of the proxy-level redirect, since Next.js middleware alone isn't a sufficient security boundary.

The create/edit form also covers the opportunity fields: kind, opens-at and deadline dates, recurrence (e.g. "annual, opens Feb"), amount, provider, and an eligibility fieldset (study levels, countries, states, fields of study, minimum year, maximum age, gender, income cap in INR). Leave a field empty when the opportunity is open on that axis. Creating a resource from an ingestion candidate pre-fills these fields from the candidate.

---

## Data Workflow

The raw export is normalized before it's inserted into Postgres:

```text
offers.json → scripts/normalize-data.ts → scripts/seed.ts → Supabase
```

Normalization maps source categories, regions, cost types, tags, descriptions, and claim URLs into the app's schema. `pnpm db:seed` is idempotent — it clears and reloads the `categories` and `resources` tables every time it runs, so it's safe to re-run whenever `offers.json` changes.

### Opportunity data (issue #79)

Two more inputs feed `pnpm db:seed`:

- **`student_resources.json`** (optional, gitignored like `offers.json`): the [resources.tensorboy.com](https://resources.tensorboy.com/resources.json) export. `scripts/student-resources.ts` maps its four buckets to `kind` (perk, scholarship, fellowship, internship, mentorship, program), drops job boards and loan marketplaces, and skips anything `offers.json` already lists, matching on the product name with deal words like "Student" or "Education Plan" removed, or on the claim link. Against the current `offers.json` that leaves about 100 net-new rows.
- **`src/lib/flagship-opportunities.ts`** (committed): about 60 hand-curated scholarships, fellowships, internships, open-source programs, and free mentorship programs, with the amount, provider, eligibility, and usual opening month. Opening dates and deadlines are only filled in where they were read off the program's official page, and `source` records that page. The seed overlays these onto matching rows and adds the rest. The mock data uses the same file, so `/deadlines` shows real programs without a database. When a new cycle is announced, update the dates in this file and re-seed. The admin dashboard and the weekly link-health notification list the entries that need a re-check (see [Link-Health Checks](#link-health-checks)).

The directory currently loads the full dataset server-side and filters in memory — intentional at ~600 rows, and a paginated query layer can be introduced later if the dataset grows significantly.

Schema changes are tracked as migrations under [`drizzle/`](drizzle). `0000_baseline.sql` is the schema before migrations were introduced and `0001_opportunity_fields.sql` adds the opportunity columns. A database first set up with `pnpm db:push` has no migration history: keep using `pnpm db:push` there, or apply only the new migration files by hand. Don't run `0000_baseline.sql` against an existing database.
### Automated Ingestion

`GET /api/cron/ingest-resources`, triggered by Vercel Cron every Monday and Thursday at 04:00 UTC, pulls candidates from the sources registered in `src/lib/ingestion/sources/` and queues new ones for review at `/admin/ingestion`. Nothing is published without admin approval. The route requires a `Bearer ${CRON_SECRET}` header.

| Source | What it adds |
|--------|--------------|
| Scholars4Dev RSS | Scholarships, with the deadline extracted from the post |
| Brabble RSS | Indian hackathons and coding contests |
| `yashisrani/List-of-OpenSource-Programs`, `ayush-sleeping/Every-Open-Source-Programs`, `deepanshu1422/List-Of-Open-Source-Internships-Programs` | Open-source programs, mentorships, internships, and fellowships |
| `sdhutchins/awesome-edu-perks` | US student perks |
| GitHub Student Developer Pack page | Pack partner offers |
| Apify actors (only when `APIFY_TOKEN` is set) | Scholarships, hackathons, Unstop listings, and flagship Internshala internships |

GitHub sources report the latest commit SHA of their file (using `GITHUB_TOKEN` when set), and a source whose fingerprint hasn't changed since the last run is skipped without downloading. Each source's last fingerprint, status, error, and counts are stored in the `ingestion_sources` table (migration `drizzle/0007_ingestion_sources.sql`); a failed run keeps the old fingerprint so the next run retries. Candidates whose deadline has already passed are dropped and counted as `expired` in the run summary.
### Ingestion review

`/admin/ingestion` is where candidates from the ingestion cron (`/api/cron/ingest-resources`) get approved or rejected. It shows a **Sources** table with each source's health (healthy, failing, stale after 14 days without a successful run, or not run yet), last run, last success, fetched/queued counts, and pending count, with a filter and a one-click "Reject all" per source. Candidates are deduplicated before they're queued: link variants of a listed offer (http/https, `www.`, fragments, trailing slashes) and same-name-same-site entries are dropped; close names, or a different page on the same offer-specific host, are queued as possible duplicates next to the matched resource; and an offer listed by two sources is queued once. A set of official vendor student pages (AWS, Azure, Google Cloud, Figma, Adobe Creative Cloud, Microsoft 365) is also watched: when a page's offer text changes, it's queued next to the listed resource so the listing can be updated.

---

## Link-Health Checks

`GET /api/cron/link-health`, triggered weekly by Vercel Cron (see [`vercel.json`](vercel.json)), re-checks every resource that has a static claim URL and hasn't been manually marked `expired`. It issues a `HEAD` request (falling back to `GET` on `405`/`501`), classifies the result as `active` or `broken`, and revalidates the homepage and directory so status changes show up immediately. The route requires a `Bearer ${CRON_SECRET}` header and runs up to 25 checks concurrently.

Before checking links, the same cron rolls over past deadlines: an approved resource whose deadline has passed is marked `expired` if it has no `recurrence`, or has its deadline cleared if it does, so the "Opens again ~<recurrence>" label stays. Rows expired this way aren't link-checked in that run, and `/deadlines` is revalidated along with the homepage and directory.

When `LINK_HEALTH_WEBHOOK_URL` is set, the cron posts a summary of newly broken links to it. The same message lists the curated programs in `src/lib/flagship-opportunities.ts` whose dates need a re-check, and it's sent when either list is non-empty, so a pending re-check is a weekly reminder until the file is updated. The admin dashboard shows the same list under "Curated programs to re-check". An entry is listed when:

- its deadline has passed and it hasn't been verified since;
- it was re-verified after the deadline, but its usual opening month (`recurrence`) has come round again since then;
- it has no deadline and its opening month has come round since it was last verified (mentorship programs are never asked for dates);
- `verifiedOn` is missing or more than 180 days old.

---

## Public API

Read-only JSON over approved resources, documented in full at `/api-docs` and summarized for agents at `/llms.txt`:

```bash
curl "http://localhost:3000/api/resources?kind=scholarship,fellowship&region=IN&deadline_before=2026-12-31"
curl "http://localhost:3000/api/resources/github-copilot"
```

- `GET /api/resources` takes `page`, `limit` (max 100), `kind` (comma-separated), `category` (slug), `region` (`IN` or `Global`), and `deadline_before` (ISO date). Invalid values return `400` naming the parameter.
- `GET /api/resources/{slug}` returns one approved resource or `404`.
- Responses send `Cache-Control: public, s-maxage=60, stale-while-revalidate=300`. Each client IP gets 60 requests per minute per function instance (`429` with `Retry-After` past that, plus `X-RateLimit-Limit` / `X-RateLimit-Remaining` headers).
## Weekly Digest

`GET /api/cron/weekly-digest`, triggered by Vercel Cron every Friday at 03:30 UTC (09:00 IST), emails every Supabase Auth user with a confirmed email two lists: approved, active resources added in the last 7 days, and approved, active resources whose deadline falls in the next 7 days (up to 10 each). Nothing is sent when both lists are empty. The route requires a `Bearer ${CRON_SECRET}` header and returns `{ skipped: … }` until `RESEND_API_KEY` and `DIGEST_FROM_EMAIL` are set. Reading the recipient list uses `SUPABASE_SERVICE_ROLE_KEY`.

Every email links to `/digest/unsubscribe`, which asks for a button click before turning the digest off, so email link scanners can't unsubscribe anyone. The link carries an HMAC of the user id signed with `DIGEST_SECRET` (or `CRON_SECRET`). Emails also send RFC 8058 `List-Unsubscribe` headers pointing at `POST /api/digest/unsubscribe` for mail providers' own unsubscribe buttons. Signed-in students can turn the digest on or off from `/my-list`. The preference is stored in `profiles.email_digest` (migration `drizzle/0006_email_digest.sql`).

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start the local Next.js development server |
| `pnpm build` | Create a production build |
| `pnpm start` | Serve the production build |
| `pnpm lint` | Run ESLint |
| `pnpm typecheck` | Run TypeScript type checking |
| `pnpm db:push` | Push the Drizzle schema to Postgres |
| `pnpm db:generate` | Generate a migration under `drizzle/` from schema changes |
| `pnpm db:migrate` | Apply pending `drizzle/` migrations |
| `pnpm db:seed` | Reload categories and resources from `offers.json` |
| `pnpm db:studio` | Open Drizzle Studio to inspect the database |
| `pnpm test` | Run unit tests with Vitest |
| `pnpm test:e2e` | Run end-to-end tests with Playwright |

---

## Design System

The homepage and `/submit` follow a custom **Student Pass** design system (see [DESIGN.md](DESIGN.md)):

- **Creative North Star**: The Student Pass — an amber ID-1 card that flips to reveal the categories it unlocks
- **One Amber Rule**: Amber marks the card and primary actions; three pass colors (cobalt, mint, lilac) live only in the category wallet
- **Real Numbers Rule**: Every count on the page comes from the database at request time — no placeholder stats
- **Typography**: Display = Anybody (variable width); Body = Atkinson Hyperlegible Next; Data = Atkinson Hyperlegible Mono
- **Elevation**: Flat by default; only the card and category passes have physical shadows
- **Motion**: Card settles on load (700ms), flip is 700ms, pass lift 280ms — all disabled under `prefers-reduced-motion`

The directory, preset pages, and admin still use the earlier token set in `src/app/globals.css` until they are restyled.

---

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import the repository in Vercel
3. Add all environment variables from `.env.local`
4. Enable **Vercel Cron** for the weekly link-health check (configured in `vercel.json`)
5. Deploy

### Other Platforms

Any platform that supports Node.js 20+ and can run `pnpm build && pnpm start` will work. Ensure you:
- Set all required environment variables
- Configure a cron/scheduler to hit `/api/cron/link-health` weekly with the `CRON_SECRET` Bearer token
- Configure a cron/scheduler to hit `/api/cron/weekly-digest` every Friday with the same Bearer token if you use the weekly digest
- Configure a cron/scheduler to hit `/api/cron/ingest-resources` every Monday and Thursday with the same Bearer token
- Run `pnpm db:push` and `pnpm db:seed` against your Supabase project before deploying

---

## Current Scope

The current implementation focuses on fast discovery, trustworthy resource metadata, and low-effort admin curation. Bookmarks are exposed through `/my-list`, and student reviews and ratings (issue #37) on resource pages and directory cards. Click events are recorded but only surface as the homepage's "Popular this week".

---

## License

MIT — see [LICENSE](LICENSE) for details.