<div align="center">

# StudentStack

**Free tools, discounts, credits, scholarships, and opportunities for students — filtered to what you can actually use.**

[Using the directory](#using-the-directory) · [Features](#features) · [Architecture](#architecture) · [Getting started](#getting-started) · [Admin](#admin)

</div>

StudentStack is a student-first resource directory for finding useful software, cloud credits, certifications, scholarships, internships, and other student offers without digging through stale, single-category lists.

The seeded dataset contains **593 resources across 15 categories**, with filters for category, region, cost type, and tags. Search is typo-tolerant, filters are reflected in the URL, and every resource carries a link-health status that a weekly cron job keeps current.

> [!NOTE]
> StudentStack runs on your own Supabase (Postgres) project — see [Getting started](#getting-started) for how to provision one and wire up the environment variables.

## Features

- **Searchable directory** with typo-tolerant matching powered by [Fuse.js](https://www.fusejs.io/).
- **Composable filters** for category, region, cost type, and tags, all reflected as shareable query parameters (`q`, `category`, `region`, `cost`, `tags`).
- **Automated link-health checks** — a weekly Vercel Cron job re-verifies every claimable URL and flips resources between `active`/`broken`, so cards never point at a dead link for long.
- **Claim-aware cards** that distinguish direct claim links from offers that vary by region and have no single static URL.
- **Live homepage counts** for resources and categories, read straight from the database.
- **A minimal admin dashboard** (single allow-listed account, gated by Supabase Auth) for creating, editing, and retiring resources without touching the database directly.
- **Responsive UI** designed for students browsing primarily on mobile.

## Architecture

```text
offers.json → scripts/normalize-data.ts → scripts/seed.ts → Supabase Postgres → Next.js
                                                                     ↑
                                                    /api/cron/link-health (weekly)
```

- **Frontend/backend**: [Next.js](https://nextjs.org/) 16 (App Router, Turbopack), [React](https://react.dev/) 19, TypeScript.
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) 4 (CSS-first `@theme`), Radix primitives and shadcn-style UI components.
- **Database**: Postgres via your own [Supabase](https://supabase.com/) project, queried with [Drizzle ORM](https://orm.drizzle.team/).
- **Auth**: Supabase Auth, gating `/admin` behind a single allow-listed email (`ADMIN_EMAIL`).
- **Scheduled jobs**: [Vercel Cron](https://vercel.com/docs/cron-jobs) triggers `/api/cron/link-health` every Monday at 03:00 UTC to re-check every claim URL.
- **Client-side search**: [Fuse.js](https://www.fusejs.io/) fuzzy-matches across name, offer, description, and tags.

```text
src/
├── app/
│   ├── page.tsx                        # Homepage
│   ├── directory/page.tsx              # Directory route
│   ├── admin/                          # Login + dashboard (Supabase Auth-gated)
│   └── api/cron/link-health/route.ts   # Weekly link-health check
├── components/
│   ├── directory/                      # Search, filters, cards, loading UI
│   ├── admin/                          # Resource create/edit form
│   └── ui/                             # Reusable interface primitives
├── db/
│   ├── index.ts                        # Postgres/Drizzle connection
│   └── schema.ts                       # Drizzle schema (categories, resources, bookmarks, reviews, click events)
├── lib/
│   ├── resources.ts                    # Resource and category queries
│   ├── link-health.ts                  # URL health-check logic
│   ├── admin/auth.ts                   # Admin session verification
│   └── supabase/                       # Supabase client helpers (browser + server)
└── proxy.ts                            # Next.js 16 middleware equivalent — refreshes admin sessions

scripts/
├── normalize-data.ts                   # Raw offers.json → normalized rows
├── seed.ts                             # Reload categories/resources into Postgres
└── create-admin.ts                     # One-time bootstrap of the admin Supabase Auth user
```

Product and design decisions are documented in [PRODUCT.md](PRODUCT.md), [DESIGN.md](DESIGN.md), and [student-resources-prd.md](student-resources-prd.md); implementation notes and judgment calls are logged in [PROGRESS.md](PROGRESS.md).

## Getting started

### Prerequisites

- Node.js LTS
- [pnpm](https://pnpm.io/installation) 11 or later
- A [Supabase](https://supabase.com/) project (free tier is enough)

### 1. Provision Supabase

Create a project, then grab the connection strings and API keys from **Project Settings → Database/API**.

> [!IMPORTANT]
> Use the Supavisor **pooler** host for both connection strings, just on different ports — the direct `db.<ref>.supabase.co` host is IPv6-only unless you've purchased the IPv4 add-on, and migrations will fail to connect through it.

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

```env
POSTGRES_URL=              # Supavisor pooler, Transaction mode (port 6543) — app runtime
POSTGRES_URL_NON_POOLING=  # Supavisor pooler, Session mode (port 5432) — drizzle-kit migrations
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY= # server-only, used by scripts/create-admin.ts
ADMIN_EMAIL=               # the one account allowed into /admin
CRON_SECRET=               # Vercel Cron sends this as a Bearer token
```

### 3. Install, migrate, and seed

```bash
pnpm install
pnpm db:push
pnpm db:seed
```

> [!IMPORTANT]
> `offers.json` is intentionally ignored by Git. A fresh clone needs the raw seed input available at the repository root before running `pnpm db:seed`. The bundled dataset produces 593 resources across 15 categories.

### 4. (Optional) create the admin account

```bash
pnpm dotenv -e .env.local -- tsx scripts/create-admin.ts you@example.com <password>
```

The email must match `ADMIN_EMAIL`.

### 5. Run the app

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Using the directory

1. Open the homepage and choose **Browse the directory**.
2. Search by resource name, offer, description, or tag — small spelling mistakes are supported.
3. Combine category, region, cost, and tag filters as needed.
4. Use the filter chips to remove individual selections, or choose **Clear all**.
5. Open a resource's official claim link when one is available. Region-dependent offers are labelled "Varies by region" when no single static link exists.

Filter state lives in the URL, so any search can be shared or bookmarked as-is:

```text
/directory?q=github&category=development-tools&region=Global&cost=free
```

## Data workflow

The raw export is normalized before it's inserted into Postgres:

```text
offers.json → scripts/normalize-data.ts → scripts/seed.ts → Supabase
```

Normalization maps source categories, regions, cost types, tags, descriptions, and claim URLs into the app's schema. `pnpm db:seed` is idempotent — it clears and reloads the `categories` and `resources` tables every time it runs, so it's safe to re-run whenever `offers.json` changes.

The directory currently loads the full dataset server-side and filters in memory — intentional at ~600 rows, and a paginated query layer can be introduced later if the dataset grows significantly.

## Admin

`/admin` is a minimal dashboard for managing resources without direct database access — create, edit, flip status (`active`/`expired`/`broken`), and delete. It's gated by Supabase Auth to a single allow-listed email (`ADMIN_EMAIL`); every Server Action re-verifies that check independently of the proxy-level redirect, since Next.js middleware alone isn't a sufficient security boundary.

## Link-health checks

`GET /api/cron/link-health`, triggered weekly by Vercel Cron (see [`vercel.json`](vercel.json)), re-checks every resource that has a static claim URL and hasn't been manually marked `expired`. It issues a `HEAD` request (falling back to `GET` on `405`/`501`), classifies the result as `active` or `broken`, and revalidates the homepage and directory so status changes show up immediately. The route requires a `Bearer ${CRON_SECRET}` header and runs up to 25 checks concurrently.

## Available scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Start the local Next.js development server |
| `pnpm build` | Create a production build |
| `pnpm start` | Serve the production build |
| `pnpm lint` | Run ESLint |
| `pnpm db:push` | Push the Drizzle schema to Postgres |
| `pnpm db:seed` | Reload categories and resources from `offers.json` |

## Current scope

The current implementation focuses on fast discovery, trustworthy resource metadata, and low-effort admin curation. The schema already includes tables for bookmarks, reviews, and click events, but those flows aren't exposed in the UI yet — they're planned for a future phase that extends the existing Supabase Auth setup to real user accounts. Students can now add resources at `/submit` (Google or email-link sign-in via Supabase Auth); submissions stay hidden until approved from the review queue in `/admin`. Multi-admin roles remain out of scope for now.
