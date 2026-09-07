---
name: StudentStack
description: A directory of free tools, discounts, credits, and scholarships for students — presented like a stack of stamped, photocopied index cards, not a SaaS landing page.
colors:
  bg: "#f1f4f6"
  panel: "#e3e7ea"
  ink: "#111418"
  ink-muted: "#4a4d53"
  line: "#abaeb2"
  orange: "#e65909"
  orange-deep: "#ad3300"
typography:
  display:
    fontFamily: "Big Shoulders, system-ui, sans-serif"
    fontSize: "clamp(2.75rem, 4vw + 1.5rem, 3.75rem)"
    fontWeight: 900
    lineHeight: 1.05
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Big Shoulders, system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 800
    lineHeight: 1.15
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Public Sans, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Public Sans, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 700
    letterSpacing: "0.04em"
rounded:
  sm: "3px"
  md: "4px"
components:
  button-primary:
    backgroundColor: "{colors.orange}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "12px 24px"
  button-primary-hover:
    backgroundColor: "{colors.orange-deep}"
    textColor: "{colors.bg}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "8px 16px"
  button-secondary-hover:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.bg}"
  stamped-card:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "16px"
---

# Design System: StudentStack

## 1. Overview

**Creative North Star: "The Photocopied Flyer"**

StudentStack looks like a stack of stamped, photocopied index cards someone pinned to a corkboard — not a funding-round SaaS landing page. The base surface is a cool photocopy-grey, never cream or paper-warm. One saturated safety-orange ink carries the brand: it's the color of a rubber stamp or a highway sign, used deliberately and generously (the call-to-action, the real resource/category counts, a full-bleed band), never sprinkled as a timid 5% accent. Type is condensed and utilitarian — a civic-signage display face paired with a plain, no-frills body sans — because the voice is a senior student handing over the actual list of free stuff, not a company pitching a solution.

This system explicitly rejects the generic SaaS template (cream background, rounded soft-shadow cards, gradient hero blocks) and anything meme/gimmicky (sticker-emoji spam, forced irony) — both ruled out in `PRODUCT.md`. It also rejects the single-category-tab, no-filtering, no-freshness-signal list model of resources.tensorboy.com, the site this product exists to outclass.

**Key Characteristics:**
- Photocopy-grey base, never cream.
- One committed accent (safety orange), used at real scale, not as a hairline detail.
- Condensed civic-signage display type in caps; plain utilitarian body type in sentence case.
- Flat surfaces everywhere except one illustrative device: hard-edged, zero-blur "stamp" shadows on the hero's resource cards.
- No identical repeating card grids — categorical data reads as a ledger/manifest list, not a feature-card grid.

## 2. Colors

A two-color system (neutral photocopy-grey + one committed orange) — deliberately not a multi-color palette, because the accent's rarity-at-scale (concentrated in a few big moments, not scattered) is the point.

### Primary
- **Safety Orange** (`#e65909`): the one brand color. Used at real scale — the primary CTA background, every real-count numeral (category counts, resource totals), and one full-bleed section band ("How to actually use this"). Verified 5.10:1 contrast with Ink text on top of it; only ≥18px/bold-≥14px text may sit directly on the photocopy-grey background in this color (3.28:1, large-text-only).
- **Deep Orange** (`#ad3300`): the same accent, deepened for two situations where the bright version fails contrast — small-size orange-toned text on the grey background (5.85:1) and hover/pressed states on orange buttons (paired with Bg-colored text, 6.46:1).

### Neutral
- **Photocopy Grey** (`#f1f4f6`): page background. A true cool neutral with a faint blue-grey cast — explicitly not cream/sand/paper-warm.
- **Carbon Panel** (`#e3e7ea`): secondary surface — hover state under ledger rows, nothing else.
- **Ink** (`#111418`): primary text and borders. 16.7:1 against Bg.
- **Ink Muted** (`#4a4d53`): secondary/supporting text. 7.7:1 against Bg — a real color, not an alpha-blended Ink, so contrast never drifts when the background changes.
- **Hairline** (`#abaeb2`): dividers and card borders only, never text.

### Named Rules
**The One Ink Rule.** Secondary text is a distinct solid color (Ink Muted), never `ink` at reduced opacity. Opacity tricks on text are how contrast quietly breaks; a named, checked color doesn't.

**The Concentrated Accent Rule.** Orange appears in a small number of large, deliberate places (CTA, counts, one full-bleed band) — never as a small icon tint, a thin rule, or a per-item color code. If a new use of orange is being added "just for a little color," don't.

## 3. Typography

**Display Font:** Big Shoulders (with system-ui, sans-serif fallback)
**Body Font:** Public Sans (with system-ui, sans-serif fallback)

**Character:** Big Shoulders is a condensed, heavy-weight grotesk built on Chicago civic signage — it reads as stamped, stenciled, official-but-scrappy. Public Sans was designed for U.S. federal digital services: plain, utilitarian, built to be read quickly and trusted. The pairing is a contrast axis (condensed/heavy display vs. plain/regular body), not two similar grotesks — and neither face is on the current reflex-reject list (Space Mono, Inter, and the rest of that list are deliberately absent from this system).

### Hierarchy
- **Display** (900, `clamp(2.75rem, 4vw + 1.5rem, 3.75rem)`, 1.05 line-height, uppercase, -0.025em tracking): the hero headline only.
- **Title** (800, 1.875rem, 1.15 line-height, uppercase): section headings (`What's actually in here`, `How to actually use this`) and the wordmark.
- **Card Title** (700, 1rem, uppercase): resource-card names in the hero stack, category names in the ledger list.
- **Body** (400, 1rem, 1.6 line-height): subheads and paragraph copy, capped around 42–55ch measure.
- **Label** (700, 0.75rem, 0.04em tracking, uppercase): the small cost-type tag on hero cards (`FREE` / `DISCOUNT` / `CREDIT`) — the only micro-label in the system, and it appears once per card, not as a repeating section eyebrow.

### Named Rules
**The No-Eyebrow Rule.** No tracked all-caps micro-label sits above a section heading. Big Shoulders' own uppercase heading treatment already carries that signal; stacking a second one on top of it is the AI-scaffolding tell this system specifically avoids.

## 4. Elevation

Flat by default. Nearly every surface — header, ledger rows, buttons, the orange band — has zero shadow; depth comes from flat color blocks and hairline dividers, not layering. The one exception is a deliberate illustrative device, not a UI affordance: the hero's five resource cards.

### Shadow Vocabulary
- **Stamp shadow** (`box-shadow: 6px 6px 0 #111418`): a hard-edged, zero-blur offset shadow used only on the hero's tilted resource cards, evoking a screen-printed or rubber-stamped card rather than a floating UI panel. Always paired with a solid 1px Ink border, never with a soft/blurred shadow on the same element.

### Named Rules
**The No Ghost-Card Rule.** A border and a soft wide-blur shadow never sit on the same element. Depth is either a hard offset shadow (the stamp) with a solid border, or no shadow at all — never a 1px border plus a diffuse drop shadow.

## 5. Components

### Buttons
- **Shape:** 3px radius (`rounded-sm` equivalent) — a stamped-corner feel, not a pill and not a sharp SaaS-card 8px+ radius.
- **Primary:** Orange background, Ink text, bold uppercase label, 12px/24px padding. This is the only place a button carries the accent as a fill.
- **Hover/Focus:** background shifts to Deep Orange with Bg-colored text (verified 6.46:1); default browser focus ring preserved, never suppressed.
- **Secondary/Ghost:** transparent background, 1px Ink border, Ink text; hover inverts to solid Ink background with Bg text. Used for the header nav link and footer link — deliberately quieter than the primary CTA.

### Cards (hero illustration only)
- **Corner Style:** 4px radius.
- **Background:** Photocopy Grey (same as page background — the card reads as cut from the same paper stock, not a raised white panel).
- **Shadow Strategy:** the Stamp shadow (see Elevation), paired with a solid 1px Ink border.
- **Internal Padding:** 16px.
- **Distinctive behavior:** five cards are absolutely positioned, each rotated and offset to a fixed resting transform (`--rot`/`--tx`/`--ty` custom properties per card), and fan into place once on page load via a single CSS keyframe animation (`cubic-bezier(0.16, 1, 0.3, 1)`, staggered ~90ms per card). Collapses to the instant resting state under `prefers-reduced-motion: reduce`.

### Ledger / Manifest List (category directory — deliberately not a card grid)
- **Style:** no borders, no boxes. Each row is icon + Big Shoulders category name + a `border-bottom: dotted` leader rule that grows to fill remaining space + the real count in Deep Orange, tabular numerals.
- **State:** row background tints to Carbon Panel on hover; the whole row is a link to `/directory?category=<slug>`.
- **Why not cards:** fifteen identically-sized bordered boxes is the single most common templated-AI tell for categorical data. A ledger/index-list reads as a directory (which this product literally is) rather than a feature grid.

### Navigation
- Header: wordmark in Display type, uppercase, left-aligned; a single secondary-style "Browse directory" link, right-aligned. No dropdown, no multi-item nav — there are only two real routes right now (`/` and `/directory`).
- Footer: mirrors the header — wordmark left, "Browse the directory" link right, quiet Ink Muted color.

## 6. Do's and Don'ts

### Do:
- **Do** use Orange at real scale — a full-bleed section band, large numerals, the primary CTA — per the Concentrated Accent Rule.
- **Do** use the Stamp shadow (`6px 6px 0 #111418`, zero blur) with a solid border when a card needs to feel physical.
- **Do** ground every number on the page in the live dataset (resource count, category counts) — never a placeholder or invented statistic.
- **Do** respect `prefers-reduced-motion: reduce` on the hero's card-fan animation; it must collapse to the final resting position instantly, not disappear.

### Don't:
- **Don't** use a cream/sand/warm-paper background. `PRODUCT.md` explicitly rejects the generic-SaaS-template look, and cream-plus-soft-shadow-cards is its most literal expression.
- **Don't** render categorical or resource data as a grid of identically-sized bordered/shadowed cards. Use the ledger list pattern instead.
- **Don't** pair a solid border with a soft, wide-blur (`≥16px`) drop shadow on the same element (the "ghost card" tell) — the Stamp shadow is zero-blur by design.
- **Don't** add a small tracked all-caps eyebrow label above a section heading. The Title type treatment already signals "heading."
- **Don't** reach for Space Mono, IBM Plex Mono, Inter, or Fraunces/Newsreader/Playfair-family serifs as reflex choices — they're the current AI-generation defaults and were deliberately passed over when this system was built.
- **Don't** go meme/gimmicky (sticker-emoji spam, forced-irony copy) — `PRODUCT.md` rules this out explicitly; the voice is scrappy and plainspoken, not jokey, since the product handles scholarships and discounts that need to read as trustworthy.
