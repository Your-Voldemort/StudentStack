# Contributing to StudentStack

Thanks for helping improve the directory. For a bug, include the route, steps to
reproduce, and expected behavior. Before starting a larger change, open an issue
to discuss the scope and check existing issues and pull requests for duplicates.

## Set up a local checkout

1. Fork the repository and clone your fork.
2. Create a branch for your change.
3. Install Node.js LTS and pnpm. The package manager version is recorded in
   [`package.json`](package.json).
4. Run `pnpm install --frozen-lockfile` from the repository root.

Read [README.md](README.md) for the architecture and full Supabase setup.
[PRODUCT.md](PRODUCT.md), [DESIGN.md](DESIGN.md), and
[student-resources-prd.md](student-resources-prd.md) describe product decisions;
[PROGRESS.md](PROGRESS.md) records implementation decisions.

## Configure the app

Copy `.env.example` to `.env.local` and fill in the values for **your development
Supabase project**. Do not commit `.env.local`, credentials, or exported user data.

| Variable | Used for |
| --- | --- |
| `POSTGRES_URL` | App database connection, using the transaction pooler on port 6543 |
| `POSTGRES_URL_NON_POOLING` | Drizzle commands, using the session pooler on port 5432 |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public client API key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only key for the admin creation script |
| `ADMIN_EMAIL` | Account allowed into the admin dashboard |
| `CRON_SECRET` | Authentication for the link-health cron endpoint |

Use the Supavisor pooler host as described in the README. The direct Supabase
database host may require IPv6 connectivity.

Run `pnpm db:push` to apply the schema to your development database, then
`pnpm dev` to start the app at <http://localhost:3000>.

### Seed data and migrations

`offers.json` is intentionally ignored by Git. If you need the seeded directory,
ask a maintainer how to obtain the input and place it at the repository root before
running `pnpm db:seed`.

**Seeding deletes and reloads the resources and categories tables. Only run it
against a disposable development database, not a shared or production database.**

For schema changes, `pnpm db:generate` creates migration files under `drizzle/`.
Review those files before using `pnpm db:migrate` to apply them to your development
database. `pnpm db:check` checks generated migration consistency; it is not a
database connectivity test. `pnpm db:studio` opens the database browser.

## Verify a change

Run these checks from the repository root:

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm test:coverage
```

Vitest discovers `src/**/*.test.{ts,tsx}` and uses jsdom with
[`vitest.setup.ts`](vitest.setup.ts). Put regression tests next to the affected
code and avoid requiring live services for unit tests. Coverage thresholds are
configured in [`vitest.config.ts`](vitest.config.ts). Use `pnpm test:watch` during
development.

For changes affecting application behavior, also run:

```sh
pnpm build
pnpm exec playwright install
pnpm test:e2e
```

The build and browser tests need a configured development Supabase project and
appropriate test data. Playwright discovers tests under `e2e/`, starts the
production server with `pnpm start`, and exercises desktop and mobile browser
projects defined in [`playwright.config.ts`](playwright.config.ts). Build first;
`pnpm start` does not create a production build. Browser tests involving admin
flows may need the development admin account described in the README.

If a check is blocked by missing credentials, seed input, or browser dependencies,
say so in the PR. Do not mark it as passing. Upstream CI may require repository
secrets that are not available to a fork.

## Submit a pull request

Keep the change focused on one issue and explain the user-facing effect. Push
your branch to your fork, then open a PR against this repository's default branch.
Use the [PR template](.github/pull_request_template.md): link the issue, describe
the change, list the commands and results you verified, and leave unchecked any
checks you did not run. Include screenshots for visible interface changes.

Do not include generated reports, build output, `node_modules`, or local
configuration in the diff. Include dependency lockfile changes only when changing
dependencies. Respond to review feedback with updates on the same branch.
