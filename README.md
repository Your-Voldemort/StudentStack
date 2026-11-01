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

[Features](#features) • [Architecture](#architecture) • [Getting Started](#getting-started) • [Using the Directory](#using-the-directory) • [Data & Automation](#data--automation) • [Public API](#public-api) • [Scripts](#available-scripts) • [Deployment](#deployment)

</div>

---

StudentStack is a student-first directory for discovering free software, cloud credits, certifications, scholarships, fellowships, internships, and mentorship programs — without digging through stale, single-category lists. The seeded dataset spans **600+ resources across 15+ categories**, with multi-axis filtering, eligibility matching, deadline tracking, side-by-side comparisons, and automated weekly link-health verification.

> [!TIP]
> You can run `pnpm install && pnpm dev` immediately without a database. When `POSTGRES_URL` is unset, StudentStack automatically falls back to built-in mock data and the curated flagship opportunities dataset.

---

## Features

### Discovery & Filtering
- **Typo-tolerant search** powered by [Fuse.js](https://www.fusejs.io/) across resource names, offers, descriptions, and tags.
- **Composable URL-synced filters** for category, opportunity kind, region (`IN` / `Global`), cost type, verification method, credit card requirement, duration, and tags.
- **"Only what I'm eligible for"** — an accountless eligibility profile (country, state, degree level, year, field of study, and verification methods like `.edu` email, GitHub Student Pack, or student ID) saved in `localStorage` and synced across devices when signed in.
- **"For you" personalized sort** — signed-in students can set their branch and year at `/onboarding` to rank relevant tools and age/year-eligible opportunities first without hiding anything.
- **Curated preset pages** (`/[preset]`) for high-intent searches such as `/free-for-indian-students`, `/github-student-pack`, `/no-edu-needed`, `/ai-tools`, `/cloud-credits`, `/scholarships-for-indian-students`, `/open-source-programs`, and `/paid-internships-india`.
- **Side-by-side comparisons** (`/compare` and `/compare/[set]`) comparing overlapping offers (cloud credits, AI coding assistants, design tools) across cost, verification, credit-card requirement, duration, region, and claim links.

### Opportunities & Deadlines
- **Opportunities alongside perks** — every resource carries a `kind` (`perk`, `scholarship`, `fellowship`, `internship`, `mentorship`, `program`) plus optional opening date, deadline, recurrence, funding amount, provider, and structured eligibility rules.
- **Deadlines hub & feeds** — browse upcoming and past cutoffs at `/deadlines`, subscribe to the global calendar (`/deadlines.ics`) or RSS feed (`/deadlines.rss`), or generate a private per-user `/u/<token>/deadlines.ics` feed of saved offers from `/my-list`.
- **Weekly email digest** — sent every Friday via [Resend](https://resend.com/) with newly added offers and deadlines closing in the next 7 days, complete with HMAC-signed and RFC 8058 one-click unsubscribe support.

### Student Workspace & Community
- **Bookmarks & application tracker** (`/my-list`) — save offers and track status as *Interested*, *Applied*, *Got it*, or *Rejected*, with aggregate *"N students got this"* social proof on cards and detail pages.
- **Student reviews & helpful votes** — students who save an offer can leave a 1–5 star rating and comment on `/r/[slug]` (with a *Verified student* badge for academic emails). Reviews sort by most recent, highest rated, or most helpful.
- **Duplicate-aware submissions** (`/submit`) — students can submit new offers (with optional *"Added by …"* contributor credit). URLs are normalized to reject duplicates already listed or awaiting review.

### Freshness, Ingestion & Curation
- **Automated link-health checks** — a weekly cron job (`/api/cron/link-health`) verifies static claim URLs, flips statuses between `active`, `broken`, and `expired`, rolls over recurring deadlines, and alerts admins of stale curated program dates.
- **Automated candidate ingestion** — a twice-weekly cron job (`/api/cron/ingest-resources`) pulls new candidates from scholarship/hackathon RSS feeds, curated GitHub repositories, the GitHub Student Developer Pack, vendor student pages, and optional Apify actors into `/admin/ingestion`.
- **Role-gated admin dashboard** (`/admin`) — manage resources, review student submissions, and triage ingested candidates behind Supabase Auth (`ADMIN_EMAIL` allow-list or profile `admin` role).

---

## Architecture

```text
offers.json ───────────┐
student_resources.json ├─► scripts/seed.ts ──► Supabase Postgres ──► Next.js 16 App Router
flagship.ts ───────────┘                              ▲
                                                      ├── /api/cron/link-health      (Mon 03:00 UTC)
                                                      ├── /api/cron/ingest-resources (Mon & Thu 04:00 UTC)
                                                      └── /api/cron/weekly-digest    (Fri 03:30 UTC)
```

| Layer | Technology |
|-------|------------|
| **Framework** | [Next.js](https://nextjs.org/) 16 (App Router, Turbopack), [React](https://react.dev/) 19, TypeScript 5 |
| **Styling** | [Tailwind CSS](https://tailwindcss.com/) 4, Radix UI primitives, custom *Student Pass* design system |
| **Database** | PostgreSQL on [Supabase](https://supabase.com/) with Row-Level Security (RLS), queried via [Drizzle ORM](https://orm.drizzle.team/) |
| **Authentication** | Supabase Auth (Google OAuth, Magic Link, and Admin Password Auth) |
| **Search** | [Fuse.js](https://www.fusejs.io/) client-side fuzzy matching |
| **Email & Cron** | [Resend](https://resend.com/) HTTP API and [Vercel Cron](https://vercel.com/docs/cron-jobs) |
| **Testing** | [Vitest](https://vitest.dev/) + Testing Library (unit/integration) and [Playwright](https://playwright.dev/) (E2E) |

### Project Structure

```text
src/
├── app/
│   ├── page.tsx                           # Homepage (interactive Student Pass + live counts)
│   ├── directory/page.tsx                 # Main searchable & filterable directory
│   ├── [preset]/page.tsx                  # Curated filter preset landing pages
│   ├── r/[slug]/page.tsx                  # Resource detail page, reviews, and comparisons
│   ├── compare/                           # /compare index and /compare/[set] tables
│   ├── deadlines/                         # /deadlines tracker UI
│   ├── deadlines.ics/ & deadlines.rss/    # Global iCal and RSS deadline feeds
│   ├── u/[token]/deadlines.ics/route.ts   # Personal saved-offers iCal feed
│   ├── my-list/                           # Saved offers, status tracker, calendar & digest controls
│   ├── onboarding/                        # Branch + year setup for "For you" ranking
│   ├── submit/                            # Student offer submission flow
│   ├── admin/                             # Admin login, resource editor, and /admin/ingestion queue
│   ├── api-docs/ & llms.txt/              # Public API documentation and AI agent discovery map
│   └── api/
│       ├── resources/                     # Public REST endpoints (/api/resources, /api/resources/[id])
│       ├── bookmarks/, profile/, reviews/ # Authenticated student state endpoints
│       ├── reports/                       # Broken-link / issue reporting endpoint
│       ├── digest/unsubscribe/            # RFC 8058 one-click email unsubscribe
│       └── cron/                          # link-health, ingest-resources, and weekly-digest jobs
├── components/
│   ├── home/                              # Student Pass 3D card, category wallet, popular list
│   ├── directory/                         # Filters, search bar, resource cards, eligibility sheet
│   ├── reviews/                           # Star ratings, review form, helpful vote buttons
│   ├── admin/                             # Resource create/edit form and ingestion review controls
│   └── ui/                                # Shared UI primitives
├── db/
│   ├── index.ts                           # Drizzle PostgreSQL client
│   └── schema.ts                          # Tables: categories, resources, bookmarks, profiles,
│                                          # reviews, review_votes, click_events, ingestion_*
├── lib/
│   ├── resources.ts                       # Core resource/category queries & mock fallbacks
│   ├── directory-filters.ts               # URL parameter parsing & multi-axis filter matching
│   ├── eligibility.ts & personalization.ts# Eligibility evaluation & "For you" ranking
│   ├── flagship-opportunities.ts          # Curated scholarships, fellowships, and open-source programs
│   ├── flagship-freshness.ts              # Stale-date detection for curated flagship programs
│   ├── comparisons.ts & presets.ts        # Comparison sets and preset definitions
│   ├── link-health.ts & ssrf.ts           # URL verification and SSRF range guards
│   ├── digest.ts, digest-data.ts, email.ts# Weekly digest formatting, HMAC signing, Resend delivery
│   └── ingestion/                         # RSS, GitHub Markdown, Vendor Watch, and Apify pipelines
└── proxy.ts                               # Next.js 16 request proxy for Supabase session refresh

scripts/
├── normalize-data.ts                      # Normalizes raw offers.json entries
├── student-resources.ts                   # Deduplicates and maps student_resources.json
├── flagship.ts                            # Overlays curated flagship opportunities
├── seed.ts                                # Idempotent database seeder
├── check-flagship-dates.ts                # CI/CLI check for stale flagship opportunity dates
├── create-admin.ts                        # Bootstraps an admin user in Supabase Auth
└── grant-admin.ts                         # Grants or revokes the admin role on an existing profile
```

Product, UX, and architectural context is maintained in [PRODUCT.md](PRODUCT.md), [DESIGN.md](DESIGN.md), [student-resources-prd.md](student-resources-prd.md), and [PROGRESS.md](PROGRESS.md).

---

## Getting Started

### Prerequisites

- **Node.js** 20+ (LTS recommended)
- **pnpm** 11+ (`corepack enable`)
- A **[Supabase](https://supabase.com/)** project (optional for local UI development; required for persistence and auth)

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Environment Variables

Copy the example environment file and fill in your Supabase credentials from **Project Settings → Database / API**:

```bash
cp .env.example .env.local
```

```env
# Database (Supabase Supavisor pooler)
POSTGRES_URL=                        # Transaction mode (port 6543) — app runtime
POSTGRES_URL_NON_POOLING=            # Session mode (port 5432) — drizzle-kit migrations

# Supabase Auth
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=           # Server-only: used by create-admin.ts and weekly digest

# Admin & Cron Security
ADMIN_EMAIL=                         # Comma-separated email(s) allowed into /admin
CRON_SECRET=                         # Bearer secret sent by Vercel Cron

# Optional Integrations
LINK_HEALTH_WEBHOOK_URL=             # Slack/JSON webhook for broken-link & stale-program alerts
SUBMISSIONS_WEBHOOK_URL=             # Webhook for new student submissions (falls back to LINK_HEALTH_WEBHOOK_URL)
RESEND_API_KEY=                      # Resend API key for Friday weekly digest emails
DIGEST_FROM_EMAIL=                   # Verified sender, e.g. "StudentStack <digest@yourdomain.com>"
DIGEST_SECRET=                       # HMAC secret for unsubscribe links (defaults to CRON_SECRET)
GITHUB_TOKEN=                        # Raises GitHub API rate limit for ingestion change detection
APIFY_TOKEN=                         # Enables paid Apify actor sources during ingestion
```

> [!IMPORTANT]
> Use the **Supavisor pooler** host for both `POSTGRES_URL` (port `6543`) and `POSTGRES_URL_NON_POOLING` (port `5432`). The direct `db.<ref>.supabase.co` host is IPv6-only unless you have purchased the IPv4 add-on, which will cause migration commands to fail on IPv4 networks.

### 3. Push Schema and Seed Data

```bash
pnpm db:push
pnpm db:seed
```

> [!NOTE]
> `offers.json` and `student_resources.json` are gitignored raw exports placed at the repository root before running `pnpm db:seed`. Curated flagship opportunities in `src/lib/flagship-opportunities.ts` are committed and always seeded.

### 4. Bootstrap an Admin Account (Optional)

Create a new admin user in Supabase Auth (must match an email in `ADMIN_EMAIL`):

```bash
pnpm dotenv -e .env.local -- tsx scripts/create-admin.ts you@example.com <password>
```

Or grant admin privileges to an existing user who has already signed in once:

```bash
pnpm dotenv -e .env.local -- tsx scripts/grant-admin.ts you@example.com
```

### 5. Start the Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Using the Directory

- **Search & Filter**: Query by keyword, category, opportunity kind, region, cost type, verification method, or tag. Every filter syncs to the URL for easy sharing:
  ```text
  /directory?q=github&category=development-tools&region=Global&cost=free
  ```
- **Eligibility Filtering**: Click **Set my eligibility** above the results to filter out offers whose country, state, degree level, minimum year, field of study, or verification requirements do not match your profile.
- **Personalized Ranking**: Sign in and visit `/onboarding` to set your branch and year of study. The directory will default to the **For you** sort, boosting offers relevant to your discipline.
- **Compare Offers**: Visit `/compare` (or click **Compare side by side** on a resource page) to view structured comparison tables defined in [`src/lib/comparisons.ts`](src/lib/comparisons.ts).

---

## Data & Automation

### Seeding Pipeline

`pnpm db:seed` normalizes and merges up to three data sources into PostgreSQL:

1. **`offers.json`** — processed via `scripts/normalize-data.ts` into canonical categories, regions, cost types, verification requirements, and claim URLs.
2. **`student_resources.json`** *(optional)* — processed via `scripts/student-resources.ts`, mapping perks, scholarships, fellowships, internships, mentorships, and programs while deduplicating against `offers.json`.
3. **`src/lib/flagship-opportunities.ts`** *(committed)* — ~60 hand-verified scholarships, fellowships, internships, and open-source programs with official source links, amounts, recurrence, and structured eligibility.

### Automated Ingestion (`/api/cron/ingest-resources`)

Triggered every Monday and Thursday at `04:00 UTC` (requires `Authorization: Bearer ${CRON_SECRET}`):

| Source | Coverage |
|--------|----------|
| **Scholars4Dev RSS** | International and regional scholarships with extracted deadlines |
| **Brabble RSS** | Indian hackathons and coding competitions |
| **GitHub Lists** (`yashisrani`, `ayush-sleeping`, `deepanshu1422`, `sdhutchins`) | Open-source programs, mentorships, internships, fellowships, and student perks |
| **GitHub Student Developer Pack** | Official partner offers |
| **Vendor Watch** | Official student pages (AWS, Azure, Google Cloud, Figma, Adobe, Microsoft 365) monitored for text changes |
| **Apify Actors** *(when `APIFY_TOKEN` is set)* | Scholarships, hackathons, Unstop listings, and Internshala internships |

Upstream commit SHAs and fingerprints are tracked in `ingestion_sources` so unchanged sources are skipped. Candidates are deduplicated against existing resources, expired deadlines are dropped, and new or updated items enter `/admin/ingestion` for human approval.

### Link-Health & Flagship Freshness (`/api/cron/link-health`)

Triggered every Monday at `03:00 UTC`:

1. **Deadline Rollover**: Marks non-recurring resources with passed deadlines as `expired`, or clears passed deadlines on recurring programs so their *"Opens again ~…"* cycle indicator remains accurate.
2. **URL Verification**: Checks up to 25 static claim URLs concurrently (`HEAD` with `GET` fallback and SSRF protection). Resources flip to `broken` on the first failure and `expired` on two consecutive failures.
3. **Curated Date Freshness**: Evaluates `src/lib/flagship-opportunities.ts` via `flagshipsNeedingRefresh()` (also runnable locally or in CI via `pnpm check:flagship-dates`) and includes stale entries in the admin dashboard and webhook summary.

### Weekly Digest (`/api/cron/weekly-digest`)

Triggered every Friday at `03:30 UTC`:

- Sends a digest via Resend to confirmed users with `profiles.email_digest = true`, featuring up to 10 new resources from the past 7 days and up to 10 deadlines closing in the next 7 days.
- Includes both a scanner-safe confirmation page (`/digest/unsubscribe`) and an RFC 8058 one-click unsubscribe endpoint (`POST /api/digest/unsubscribe`).

---

## Public API

StudentStack exposes a rate-limited, CDN-cached read API for developers and AI agents. Full interactive documentation is available at `/api-docs`, and an agent-friendly index is served at `/llms.txt`.

```bash
# List approved scholarships and fellowships in India closing before end of year
curl "http://localhost:3000/api/resources?kind=scholarship,fellowship&region=IN&deadline_before=2026-12-31"

# Fetch a single resource by slug
curl "http://localhost:3000/api/resources/github-copilot"
```

- **`GET /api/resources`**: Supports `page`, `limit` (max `100`), `kind` (comma-separated), `category` (slug), `region` (`IN` or `Global`), and `deadline_before` (ISO date).
- **`GET /api/resources/{slug}`**: Returns a single approved resource or `404`.
- **Caching & Rate Limits**: Responses include `Cache-Control: public, s-maxage=60, stale-while-revalidate=300` and allow 60 requests/minute per client IP (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `Retry-After`).

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start the local Next.js development server (Turbopack) |
| `pnpm build` | Create a production build |
| `pnpm start` | Start the production server |
| `pnpm lint` | Run ESLint across the repository |
| `pnpm typecheck` | Run TypeScript compiler checks (`tsc --noEmit`) |
| `pnpm test` | Run unit and integration tests with Vitest |
| `pnpm test:watch` | Run Vitest in interactive watch mode |
| `pnpm test:coverage` | Run Vitest with V8 coverage thresholds |
| `pnpm test:e2e` | Run Playwright end-to-end tests across desktop and mobile viewports |
| `pnpm check:flagship-dates` | Check curated flagship opportunities in `src/lib/flagship-opportunities.ts` for stale dates |
| `pnpm db:push` | Push the Drizzle schema directly to PostgreSQL |
| `pnpm db:generate` | Generate SQL migration files under `drizzle/` |
| `pnpm db:migrate` | Apply pending Drizzle migrations |
| `pnpm db:check` | Verify consistency of generated Drizzle migrations |
| `pnpm db:seed` | Normalize and seed categories and resources into PostgreSQL |
| `pnpm db:studio` | Launch Drizzle Studio to inspect and edit database tables |

---

## Deployment

### Vercel (Recommended)

1. Push the repository to GitHub and import it into [Vercel](https://vercel.com/).
2. Configure all required environment variables from `.env.example`.
3. Vercel Cron will automatically register the three schedules defined in [`vercel.json`](vercel.json):
   - `/api/cron/link-health` — `0 3 * * 1` (Mondays at 03:00 UTC)
   - `/api/cron/ingest-resources` — `0 4 * * 1,4` (Mondays & Thursdays at 04:00 UTC)
   - `/api/cron/weekly-digest` — `30 3 * * 5` (Fridays at 03:30 UTC)
4. Run `pnpm db:push` and `pnpm db:seed` against your production Supabase database, then deploy.

### Self-Hosting

StudentStack runs on any platform supporting Node.js 20+ (`pnpm build && pnpm start`). When self-hosting, configure an external scheduler (such as GitHub Actions, systemd timers, or cron) to call the `/api/cron/*` endpoints with the `Authorization: Bearer ${CRON_SECRET}` header on the schedules above.
