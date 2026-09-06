# PRD: StudentStack — A Student Resources Directory

**Status:** Draft v1
**Owner:** Shrey Tripathi
**Last updated:** September 2026
**Reference inspiration:** resources.tensorboy.com (151 resources extracted, see Appendix A)

---

## 1. Problem Statement

Students spend real time discovering which free tools, certifications, scholarships, and internships they're eligible for — the information exists, but it's scattered across university mailing lists, WhatsApp forwards, and directories like tensorboy's that go stale fast (dead links, expired offers, no way to track a deadline). tensorboy's site proves the content model works — 150+ curated resources across 4 categories get real usage — but it stops at "here's a list." It has no filtering beyond one category tab at a time, no freshness signal, no accounts, and no way to act on time-bound opportunities like GSoC or Rhodes before the deadline passes.

**Who's affected:** Undergrad and postgrad students (India-first, globally relevant) actively hunting for free tools, certs, scholarships, or internships — high-intent, low-patience, mostly on mobile.

**Cost of not solving it:** Students miss hard-deadline opportunities, waste time on dead links, and re-discover the same 10 resources everyone already knows about instead of the long tail that actually fits their branch/year.

---

## 2. Goals

| # | Goal | Metric | Target |
|---|---|---|---|
| G1 | Users find a relevant resource faster than the reference site | Median time-to-first-click from landing | < 20s |
| G2 | Directory stays trustworthy over time | % of live links verified in last 7 days | > 95% |
| G3 | Users return instead of one-and-done browsing | 7-day return rate | > 25% |
| G4 | Deadline-bound resources actually get acted on | % of scholarship/internship clicks that happen >3 days before deadline | > 60% |
| G5 | Directory grows without owner bottleneck | % of new resources sourced from community submissions by month 3 | > 30% |

## 3. Non-Goals (v1)

- **Not a full application/ATS system** — we link out to the official application page; we don't host application forms ourselves. (Too much liability/scope; revisit only if there's clear demand.)
- **Not building our own auth/identity verification** (e.g., verifying someone is really a student via .edu email) — v1 trusts self-reported profile info. (Verification is a whole project on its own; UNiDAYS/Student Beans already solve it for the offers that need it.)
- **Not a job board** — internships stay curated, not an open posting marketplace. (Different moderation model, different scale problem.)
- **No native mobile app in v1** — responsive web only. (PWA install is enough validation before justifying native.)
- **No monetization/ads in v1** — focus entirely on trust and usage first. (Ads on a "free stuff for students" site is a credibility risk before there's an audience.)

## 4. Target Users / Personas

1. **The Grinder** — 2nd/3rd-year engineering student, competitive programmer or hackathon regular, wants dev tools/cloud credits/certs. Scans fast, bounces if filtering is bad.
2. **The Planner** — final-year student tracking scholarship and fellowship deadlines months out. Needs the deadline view and reminders more than anything else.
3. **The Explorer** — 1st/2nd year, doesn't know what's out there yet. Needs good categorization and "surprise me" discovery, not just search.
4. **The Contributor** (later phase) — a student or campus ambassador who found something not on the list and wants to submit it.

---

## 5. Tech Stack

Chosen to match a solo full-stack builder's existing comfort (Next.js/Postgres, per the Mailvex/Katagoge stack) while staying appropriately light for a content-directory app — no need for the Go workers or 46-phase backend those projects carry. All versions below were checked against current documentation (via Context7) rather than assumed from memory, since this stack moves fast.

| Layer | Choice | Notes (current as of this doc) |
|---|---|---|
| Framework | **Next.js 16** (App Router) | Server Components are the default for every file under `app/` unless it declares `"use client"`. `cacheComponents` (Partial Prerendering) is now a stable default behavior, not an experimental flag — plan the app around explicit `"use cache"` boundaries rather than the old `experimental_ppr` config. |
| Language | TypeScript (strict mode) | |
| Styling | **Tailwind CSS v4** | CSS-first config — no `tailwind.config.js` needed for the common case. Install `tailwindcss` + `@tailwindcss/postcss`, then `@import "tailwindcss";` in `globals.css`. Theme tokens are defined in CSS via `@theme` instead of a JS config object. |
| UI components | **shadcn/ui** (CLI v3.x) | `npx shadcn@latest init -t next`. Note the CLI now supports a `--base` flag (`radix`, `base`, `aria`) — default to `radix` unless you have a reason to switch to Base UI. Components are copied into your repo, not installed as a dependency — you own and can edit them. |
| Client-side search | **Fuse.js** | Fuzzy search over the in-memory resource list. At ~150–1000 items this beats standing up Algolia/Meilisearch. |
| Database | **PostgreSQL** via **Supabase** (or Neon) | Supabase also gives free Auth + Storage + Row Level Security, which removes a whole layer of custom auth code. |
| ORM | **Drizzle ORM** + **drizzle-kit** | Schema defined with `pgTable` in TypeScript; `drizzle-kit push` for fast dev iteration, `drizzle-kit generate` + `migrate` once the schema stabilizes. |
| Auth | **Supabase Auth** via `@supabase/ssr` | Use `createServerClient` in middleware to refresh sessions server-side and `createBrowserClient` on the client. Prefer `supabase.auth.getUser()` (or the newer `getClaims()`) over trusting a locally-cached session, since only those actually re-validate with the server. |
| Admin CMS | Custom `/admin` route group (Phase 2) | Simpler than bolting on Payload/Directus for ~5 admin screens; revisit only if the admin surface grows a lot. |
| Link-health checks | **Vercel Cron** (or GitHub Actions scheduled workflow) | Weekly job pings every `url`, updates `status` + `last_verified_at`. |
| Analytics | **PostHog** | Self-hostable option, generous free cloud tier, gives click-through funnels per resource. |
| Transactional/digest email | **Resend**, or **your own Mailvex** once it's live | Dogfooding opportunity for Mailvex if you want a real early user of it. |
| Hosting | **Vercel** (app) + **Supabase/Neon** (DB) | Pairs natively with Next.js; zero-config previews per PR. |
| Package manager | pnpm | Faster installs, matches most current Next.js starter conventions. |

---

## 6. System Architecture (high level)

```
┌─────────────────────────┐
│  Next.js App (Vercel)   │
│  ┌────────────────────┐ │
│  │ Server Components   │─┼──► Postgres (Supabase) via Drizzle
│  │ (resource grid,     │ │
│  │  filters, SSR)      │ │
│  └────────────────────┘ │
│  ┌────────────────────┐ │
│  │ Client Components   │─┼──► Fuse.js (in-browser fuzzy search)
│  │ (filter UI, search) │ │
│  └────────────────────┘ │
│  ┌────────────────────┐ │
│  │ Server Actions       │─┼──► Supabase Auth (bookmarks, submissions)
│  └────────────────────┘ │
└─────────────────────────┘
             │
             ▼
   Vercel Cron (weekly) ──► link-health checker ──► updates `status`/`last_verified_at`
             │
             ▼
   PostHog (click + funnel events)
```

---

## 7. Data Model

```typescript
// schema.ts — Drizzle ORM, PostgreSQL dialect

export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),      // 'tools-software'
  name: text('name').notNull(),               // 'Tools & Software'
  icon: text('icon').notNull(),               // '🛠️'
  sortOrder: integer('sort_order').notNull().default(0),
});

export const resources = pgTable('resources', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  tagline: text('tagline'),                   // "Free 1 Year access"
  description: text('description').notNull(),
  url: text('url').notNull(),
  categoryId: integer('category_id').notNull().references(() => categories.id),
  tags: text('tags').array().notNull().default([]),
  region: text('region', { enum: ['IN', 'Global'] }).notNull().default('Global'),
  costType: text('cost_type', {
    enum: ['free', 'discount', 'stipend', 'scholarship', 'credits']
  }).notNull(),
  deadline: timestamp('deadline'),            // nullable — only time-bound resources set this
  status: text('status', { enum: ['active', 'expired', 'broken'] }).notNull().default('active'),
  lastVerifiedAt: timestamp('last_verified_at'),
  clickCount: integer('click_count').notNull().default(0),
  submittedBy: text('submitted_by'),          // nullable — user id if community-sourced
  approved: boolean('approved').notNull().default(true), // false while in moderation queue
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const bookmarks = pgTable('bookmarks', {
  userId: uuid('user_id').notNull(),          // references Supabase auth.users
  resourceId: integer('resource_id').notNull().references(() => resources.id),
  status: text('status', { enum: ['interested', 'applied', 'got_it', 'rejected'] })
    .notNull().default('interested'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => ({ pk: primaryKey({ columns: [t.userId, t.resourceId] }) }));

export const reviews = pgTable('reviews', {
  id: serial('id').primaryKey(),
  resourceId: integer('resource_id').notNull().references(() => resources.id),
  userId: uuid('user_id').notNull(),
  rating: integer('rating').notNull(),        // 1-5
  comment: text('comment'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const clickEvents = pgTable('click_events', {
  id: serial('id').primaryKey(),
  resourceId: integer('resource_id').notNull().references(() => resources.id),
  userId: uuid('user_id'),                    // nullable — anonymous clicks allowed
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
```

`profiles` (branch, year, interests) extends Supabase's built-in `auth.users` via a 1:1 `profiles` table — standard Supabase pattern, not detailed here.

---

## 8. Feature Requirements

### P0 — Must-Have (v1 cannot ship without these)

#### 8.1 Resource Directory with Real Filtering
**User story:** As a student, I want to filter resources by category, tag, region, and cost type simultaneously, so that I don't have to scroll through irrelevant entries one category-tab at a time.

**Acceptance criteria:**
- [ ] Given the directory page, when I select "Tools & Software" + tag "cloud" + region "Global", then only resources matching all three show
- [ ] Filters are reflected in the URL query string (shareable, back-button-safe)
- [ ] Clearing all filters returns to the full 150+ list within 300ms (client-side, no reload)
- [ ] Empty state shows a clear "no matches — try removing a filter" message, never a blank screen

#### 8.2 Fuzzy Search
**User story:** As a student, I want to type "aws" or "gtihub" (typo included) and still find AWS Educate / GitHub Student Pack, so that I don't need exact naming.

**Acceptance criteria:**
- [ ] Search matches on name, tagline, description, and tags
- [ ] Results update within 100ms of keystroke (debounced)
- [ ] Search combines with active filters (AND logic)

#### 8.3 Resource Card & Freshness Signal
**Acceptance criteria:**
- [ ] Every card shows name, tagline, short description, category icon, tags (clickable → applies as filter), and a "Claim" CTA that opens the official URL in a new tab
- [ ] Card shows "Verified {relative time}" (e.g., "Verified 2 days ago") sourced from `last_verified_at`
- [ ] If `status = 'broken'`, show a muted "⚠ Link may be down" badge instead of hiding the card outright (transparency over silent removal)

#### 8.4 Deadline View
**User story:** As a planner-type student, I want a single view sorted by deadline, so I never miss a hard cutoff like GSoC or Rhodes applications.

**Acceptance criteria:**
- [ ] `/deadlines` route lists all resources with a non-null `deadline`, soonest first
- [ ] Resources with deadlines within 14 days get a visually distinct "closing soon" badge
- [ ] Expired deadlines auto-move to a collapsed "past" section, not deleted (useful for next year's cycle)

#### 8.5 Admin CRUD
**User story:** As the site owner, I want to add/edit/deprecate a resource without redeploying code, so that I can keep the directory current in minutes.

**Acceptance criteria:**
- [ ] `/admin` (auth-gated, single admin role) lists all resources with inline edit
- [ ] Creating a resource requires: name, url, category, cost type, description (tags/region/deadline optional)
- [ ] Setting `status = 'broken'` or `'expired'` reflects on the public site within one page load (no cache staleness > revalidation window)

#### 8.6 Link Health Monitoring
**Acceptance criteria:**
- [ ] Weekly cron job requests every resource's `url` (HEAD request, fallback GET)
- [ ] 4xx/5xx or timeout → `status = 'broken'`, admin gets a summary notification
- [ ] Successful check updates `last_verified_at` regardless of prior status
- [ ] Job completes for all 150+ current resources in under 5 minutes

### P1 — Should-Have (strong fast-follows)

#### 8.7 Auth + Bookmarks + Application Tracker
- Sign up/in via Supabase Auth (email + Google OAuth)
- "Save" icon on every card → adds to `/my-list`
- Status pill per saved resource: Interested / Applied / Got it / Rejected — updates from the card itself, no separate page needed

#### 8.8 Personalization Signals
- Onboarding asks branch + year (optional, skippable)
- Resources tagged to a branch (e.g., MATLAB, SolidWorks → ECE/Mechanical) sort higher for matching users — a ranking boost, never a hard filter

#### 8.9 Comparison View
- For pre-defined overlapping clusters (cloud credits, AI coding assistants, design tools) show a side-by-side table
- v1 ships with 3 hand-picked comparison sets; more added as content, not as a user-facing "build your own comparison" tool

### P2 — Future Considerations (design for, don't build yet)

#### 8.10 Community Submissions + Moderation Queue
- Logged-in users can submit a resource (`approved = false` until admin review)
- Design the `resources` table's `submittedBy`/`approved` columns now (already in the schema above) so this doesn't require a migration later

#### 8.11 Reviews & Ratings
- `reviews` table already modeled above; ship the read path once there's enough logged-in traffic to expect write volume

#### 8.12 Weekly Digest Email
- "New this week" + "closing in 7 days" — sent via Resend or Mailvex

#### 8.13 Public Read API
- `GET /api/resources` (paginated, filterable by category/tag) for campus ambassador bots/Discord integrations
- Rate-limited, no auth required for reads

#### 8.14 Browser Extension
- Detects when you're on a site with a known student discount and surfaces it — genuinely separate project scope, listed here only so architecture doesn't block it later

---

## 9. Route Map

| Route | Renders | Auth |
|---|---|---|
| `/` | Landing + featured/trending resources | Public |
| `/directory` | Full filterable grid | Public |
| `/directory/[category]` | Pre-filtered by category (SEO-friendly deep link) | Public |
| `/resource/[slug]` | Single resource detail (description, comments if P2 shipped) | Public |
| `/deadlines` | Chronological deadline view | Public |
| `/compare/[set]` | Comparison tables | Public |
| `/my-list` | Bookmarked resources + tracker | Auth required |
| `/submit` | Community submission form | Auth required |
| `/admin` | CRUD dashboard | Admin only |
| `/api/resources` | Public read API (P2) | Public, rate-limited |

---

## 10. Non-Functional Requirements

- **Performance:** LCP < 2.0s on 4G for `/directory`; resource grid ships as Server Component HTML, filters hydrate client-side only for the interactive parts
- **Accessibility:** WCAG 2.1 AA — keyboard-navigable filters, proper contrast on badges, `aria-label`s on icon-only buttons
- **SEO:** Each `/resource/[slug]` and `/directory/[category]` page gets unique meta title/description; sitemap.xml auto-generated from the `resources` table
- **Security:** Row Level Security on Supabase tables — a user can only write their own `bookmarks`/`reviews`/`submissions`, never another user's
- **Data integrity:** `url` field validated as a well-formed URL on both client and server before insert

---

## 11. Success Metrics (recap with measurement method)

| Metric | Method | Evaluate at |
|---|---|---|
| Time-to-first-click | PostHog funnel: pageview → outbound click | 30 days post-launch |
| % links verified <7 days | Query: `count(status='active' AND last_verified_at > now() - 7d) / count(*)` | Ongoing, weekly |
| 7-day return rate | PostHog retention chart | 30/60/90 days |
| Deadline-click lead time | `deadline - click_event.created_at` distribution | Per admissions cycle |
| % community-sourced resources | `count(submittedBy IS NOT NULL) / count(*)` | Monthly |

---

## 12. Open Questions

- **[Product]** Should "Got it" status on the tracker ever be shown publicly (social proof: "234 students got this") or stay private? Affects schema (aggregate count vs. private-only).
- **[Product]** Is India-only scope intentional long-term, or should region filtering expand to more countries as content grows?
- **[Engineering]** Self-host PostHog or use their cloud free tier? Affects whether analytics data leaves your own infra.
- **[Design]** Does personalization (8.8) need an explicit onboarding step, or should it infer branch/year silently from behavior over time?

## 13. Timeline / Phasing

| Phase | Scope | Rough effort (solo) |
|---|---|---|
| **1 — MVP** | §8.1–8.3 with seeded data (use Appendix A JSON), no DB writes yet | 1 weekend |
| **2 — Real data layer** | Postgres + Drizzle, admin CRUD (§8.5), link health cron (§8.6) | 1–2 weeks |
| **3 — Accounts** | Auth, bookmarks/tracker (§8.7), deadline view (§8.4), personalization (§8.8) | 1–2 weeks |
| **4 — Community** | Submissions + moderation (§8.10), comparison view (§8.9) | 1 week |
| **5 — Growth** | Reviews (§8.11), digest email (§8.12), public API (§8.13) | Ongoing |

---

## Appendix A — Seed Data

151 resources already extracted from resources.tensorboy.com, categorized and ready to seed the `resources` table directly: `student_resources.json` (delivered separately in this conversation).
