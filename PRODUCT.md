# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **The Grinder** — 2nd/3rd-year engineering student, competitive programmer or hackathon regular, hunting dev tools, cloud credits, and certifications. Scans fast, bounces if filtering is bad. Mostly mobile.
- **The Planner** — final-year student tracking scholarship and fellowship deadlines months out. Cares about freshness and not missing a hard cutoff more than anything else.
- **The Explorer** — 1st/2nd-year student who doesn't know what's out there yet. Needs good categorization and discovery, not just search.
- **The Contributor** — student who found an unlisted offer and submits it via `/submit` for moderator review.
- **The Moderator (Admin)** — curator reviewing student submissions, triaging weekly link-health failures, and approving or rejecting automated ingestion candidates via `/admin` and `/admin/ingestion`.

All student personas are high-intent, low-patience, India-first but globally relevant, and have been burned before by dead links or stale "free stuff" lists.

## Product Purpose

StudentStack is a curated directory of free tools, software discounts, certifications, scholarships, fellowships, internships, and mentorship programs for students — a filterable, freshness-aware alternative to bare-bones static lists like `resources.tensorboy.com`. Success looks like: median time-to-first-click under 20 seconds, >95% of live links verified within the last 7 days, students trusting the directory stays current, and people returning instead of one-and-done browsing.

## Positioning

Unlike static GitHub lists or single-tab directories (`resources.tensorboy.com`), StudentStack combines multi-axis filtering (category, cost type, verification method, credit-card requirement, India vs. global availability, opportunity kind, and personal eligibility) with automated weekly link-health verification (`active`, `broken`, `expired`), deadline tracking (`.ics` calendar feeds, `.rss` feeds, and weekly email digests), side-by-side tool comparisons (`/compare`), and community + automated source ingestion gated by human review.

## Operating Context

- Students discover offers on mobile or desktop, filter by what they actually qualify for (`.edu` email, GitHub Student Developer Pack, student ID, or no verification; India vs. global), and click through directly to the official claim or application page.
- Students track applications and perks in `/my-list` (`interested`, `applied`, `got_it`, `rejected`) and subscribe to personal or global `.ics` deadline calendars (`/deadlines.ics`, `/u/[token]/deadlines.ics`).
- Automated cron jobs check link health weekly (`/api/cron/link-health`), ingest new candidates from upstream sources (`/api/cron/ingest-resources`), and send weekly digests (`/api/cron/weekly-digest`).
- AI agents and external tools query `/api/resources` and `/llms.txt`.

## Capabilities and Constraints

- **Out-linking directory, not an ATS:** Links directly to official vendor or scholarship application pages; never hosts application forms or collects student identity documents.
- **Self-reported eligibility:** Profile and onboarding filters (`src/lib/eligibility.ts`, `/onboarding`) boost or filter offers based on student-reported degree level, branch, year, country/state, and verification methods without requiring document uploads.
- **Moderation gate:** Community submissions (`/submit`) and automated ingestion candidates (`ingestion_candidates`) remain hidden from public pages until approved by an admin (`/admin`, `/admin/ingestion`).
- **No monetization or ads in v1:** Focus is strictly on utility and trust; no ad slots, affiliate popups, or sponsored rankings.
- **Responsive web only in v1:** Built on Next.js 16 (App Router), React 19, Tailwind CSS v4, Drizzle ORM, and Supabase (PostgreSQL + Auth).

## Brand Commitments

- **Scrappy & resourceful ("The Student Pass"):** The voice of a senior student who already found all the free stuff and is handing over the actual list — not a startup explaining a "solution." Plainspoken, a little wry, allergic to fluff.
- **Anti-references:**
  - *Generic SaaS template* — no cream/white marketing fluff, no invented social proof or fake hero-metric blocks.
  - *Meme/gimmicky* — no sticker-emoji spam or forced Gen-Z slang; copy must read as trustworthy for high-stakes scholarships and fellowships.
  - *Single-tab unmaintained lists* (`resources.tensorboy.com`) — no unfilterable walls of links without freshness or verification signals.

## Evidence on Hand

- **Live dataset & schema (`src/db/schema.ts`, `data/student-resources.json`):** 600+ seeded and curated resources across 15+ categories with real cost types (`free`, `discount`, `credits`, `trial`, `scholarship`, `stipend`), verification requirements, regional availability (`regions`, `regionLocked`), and deadlines.
- **Real telemetry (`src/lib/resources.ts`):** Live offer counts, per-category counts, 7-day click popularity (`click_events`), student reviews and ratings (`reviews`, `review_votes`), and `last_verified_at` timestamps come directly from PostgreSQL at request time.
- **Absences not to fabricate:** No invented user testimonials, fake company endorsements, or placeholder "trending" counts when underlying click/review data is empty.

## Product Principles

1. **Real content over decoration** — every number, name, and card on the page must trace back to the actual database, never a placeholder stat or invented testimonial.
2. **Plainspoken over polished-corporate** — copy talks like a student who found the deals, not a company announcing a solution.
3. **Prove it before asking for trust** — surface real counts, categories, verification requirements, and link-check state early rather than making claims the data cannot back up.
4. **Speed over ceremony** — the Grinder persona bounces if finding is slow; every decision should shorten the path to `/directory` and official claim links.
5. **Specific over generic** — every visual and copy choice should trace to a directory of student perks and opportunities, not a reusable SaaS template.

## Accessibility & Inclusion

WCAG 2.1 AA (PRD §10): keyboard-navigable filters and cards, contrast-verified tokens across light and dark modes, visible form labels and `aria-describedby` hints/errors, `aria-label`s on icon-only controls, and full `prefers-reduced-motion` support across all animations and loaders.
