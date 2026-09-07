# Product

## Register

brand

## Users

- **The Grinder** — 2nd/3rd-year engineering student, competitive programmer or hackathon regular, hunting dev tools/cloud credits/certs. Scans fast, bounces if filtering is bad. Mostly mobile.
- **The Planner** — final-year student tracking scholarship/fellowship deadlines months out. Cares about freshness and not missing a hard cutoff more than anything else.
- **The Explorer** — 1st/2nd-year, doesn't know what's out there yet. Needs good categorization and discovery, not just search.

All three are high-intent, low-patience, India-first but globally relevant, and have been burned before by dead links or stale "free stuff" lists.

## Product Purpose

StudentStack is a curated directory of free tools, software discounts, certifications, scholarships, and internships for students — a more feature-complete, filterable, freshness-aware alternative to bare-bones lists like resources.tensorboy.com (593 resources currently seeded, 15 categories). Success looks like: median time-to-first-click under 20 seconds, students trusting the directory stays current, and people returning instead of one-and-done browsing.

## Brand Personality

**Scrappy & resourceful.** The voice of a senior who already found all the free stuff and is handing over the actual list — not a startup explaining a "solution." Plainspoken, a little wry, allergic to fluff. Confident about specifics (real counts, real categories, real verification state) rather than vague superlatives or invented social proof.

## Anti-references

- **Generic SaaS template** — cream/white background, rounded cards with soft grey shadows, gradient hero-metric blocks. This is a directory of real deals, not a funding-round landing page.
- **Meme/gimmicky** — no sticker-emoji spam, no forced Gen-Z voice. The copy needs to read as trustworthy even while being plainspoken, since it's handling scholarships and discounts, not just jokes.
- **resources.tensorboy.com's list-in-a-tab UX** (from the PRD's own problem statement) — single category tab at a time, no combinable filtering, no freshness signal. The thing this directory exists to outclass.

## Design Principles

1. **Real content over decoration** — every number, name, and card on the page should trace back to the actual dataset, never a placeholder stat or invented testimonial.
2. **Plainspoken over polished-corporate** — copy talks like a student who found the deals, not a company announcing a solution.
3. **Prove it before asking for trust** — surface real counts, categories, and verification state early rather than making claims the data can't back up.
4. **Speed over ceremony** — the Grinder persona bounces if finding is slow; every homepage decision should shorten the path to `/directory`, not decorate the wait.
5. **Specific over generic** — every visual and copy choice should be traceable to "this is a directory of free stuff for students," not a reusable template that could belong to any SaaS.

## Accessibility & Inclusion

WCAG 2.1 AA (PRD §10): keyboard-navigable filters, sufficient contrast on badges and body text, `aria-label`s on icon-only buttons. Respect `prefers-reduced-motion` for any homepage animation.
