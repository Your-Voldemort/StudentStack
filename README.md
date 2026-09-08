<div align="center">

# StudentStack

**Free tools, discounts, credits, scholarships, and opportunities for students — filtered to what you can actually use.**

[Browse the directory](#using-the-directory) · [Features](#features) · [Data workflow](#data-workflow) · [Available scripts](#available-scripts)

</div>

StudentStack is a student-first resource directory for finding useful software, cloud credits, certifications, scholarships, internships, and other student offers without digging through stale, single-category lists.

The current dataset contains **593 resources across 15 categories**, with filters for category, region, cost type, and tags. Search is typo-tolerant, filters are reflected in the URL, and each resource surfaces its verification time and claim status.

> [!NOTE]
> StudentStack is currently in local-development phase. It uses SQLite and a local `offers.json` seed file; the planned Postgres/Supabase schema is present but is not wired into the app yet.

## Features

- **Searchable directory** with typo-tolerant matching powered by Fuse.js.
- **Composable filters** for category, region, cost type, and tags.
- **Shareable filter URLs** using query parameters such as `q`, `category`, `region`, `cost`, and `tags`.
- **Freshness signals** showing when a resource was last verified.
- **Claim-aware cards** that distinguish direct links from offers that vary by region or route.
- **Live homepage counts** for resources and categories, read from the database.
- **Responsive UI** designed for students who are browsing primarily on mobile.

## Tech stack

- [Next.js](https://nextjs.org/) 16 App Router
- [React](https://react.dev/) 19 and TypeScript
- [Tailwind CSS](https://tailwindcss.com/) 4
- [Drizzle ORM](https://orm.drizzle.team/) with [better-sqlite3](https://github.com/WiseLibs/better-sqlite3)
- [Fuse.js](https://www.fusejs.io/) for client-side fuzzy search
- Radix primitives and shadcn-style UI components

## Getting started

### Prerequisites

- Node.js LTS
- [pnpm](https://pnpm.io/installation) 11 or later

### Install and run locally

```bash
pnpm install
pnpm db:push
pnpm db:seed
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) after the development server starts.

> [!IMPORTANT]
> `offers.json` and `local.db` are intentionally ignored by Git. A fresh clone needs the local seed input available at the repository root before running `pnpm db:seed`. The checked-out development dataset is expected to produce 593 resources and 15 categories.

The SQLite path defaults to `local.db`. To use another location, copy `.env.example` to `.env.local` and set `SQLITE_PATH`:

```bash
cp .env.example .env.local
```

```env
SQLITE_PATH=/path/to/studentstack.db
```

## Using the directory

1. Open the homepage and choose **Browse the directory**.
2. Search by resource name, offer, description, or tag. Small spelling mistakes are supported.
3. Combine category, region, cost, and tag filters as needed.
4. Use the filter chips to remove individual selections, or choose **Clear all**.
5. Open a resource’s official claim link when one is available. Region-dependent offers are labelled when no single static link exists.

The directory can be shared with its current state intact. For example:

```text
/directory?q=github&category=development-tools&region=Global&cost=free
```

## Data workflow

The raw export is normalized before it is inserted into SQLite:

```text
offers.json → scripts/normalize-data.ts → local.db → Next.js pages
```

Normalization maps source categories, regions, cost types, tags, descriptions, and claim URLs into the local schema. The seed script is idempotent: it clears and reloads the `categories` and `resources` tables each time it runs.

```bash
pnpm db:seed
```

The app currently loads the full directory server-side and performs filtering in memory. This is intentional for the current dataset size and keeps the first version simple; a paginated query layer can be introduced as the directory grows.

## Project structure

```text
src/
├── app/
│   ├── page.tsx                 # Homepage
│   └── directory/page.tsx       # Directory route
├── components/
│   ├── directory/               # Search, filters, cards, and loading UI
│   └── ui/                      # Reusable interface primitives
├── db/
│   ├── index.ts                 # SQLite/Drizzle connection
│   ├── schema.sqlite.ts         # Local development schema
│   └── schema.ts                # Planned PostgreSQL schema
└── lib/
    ├── resources.ts             # Resource and category queries
    └── format.ts                # Display formatting helpers

scripts/
├── normalize-data.ts            # Raw data normalization
└── seed.ts                      # SQLite seed script
```

Product and design decisions are documented in [PRODUCT.md](PRODUCT.md), [DESIGN.md](DESIGN.md), and [student-resources-prd.md](student-resources-prd.md).

## Available scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Start the local Next.js development server |
| `pnpm build` | Create a production build |
| `pnpm start` | Serve the production build |
| `pnpm lint` | Run ESLint |
| `pnpm db:push` | Push the local Drizzle schema to SQLite |
| `pnpm db:seed` | Reload categories and resources from `offers.json` |

## Current scope

The current implementation focuses on fast discovery and trustworthy resource metadata. The database schema already includes placeholders for bookmarks, reviews, and click events, but those flows are not exposed in the UI yet. Authentication, reminders, community submissions, and a hosted Postgres deployment remain outside the current local-development slice.
