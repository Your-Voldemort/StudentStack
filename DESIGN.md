---
name: StudentStack
description: A directory of free tools, discounts, credits, and scholarships for students. The homepage is built around a student ID pass, the thing that actually unlocks every offer.
colors:
  ground: "#ffffff"
  surface: "oklch(0.972 0.005 65)"
  ink: "oklch(0.21 0.012 65)"
  muted: "oklch(0.47 0.014 65)"
  line: "oklch(0.89 0.008 65)"
  amber: "oklch(0.774 0.174 65.1)"
  amber-hover: "oklch(0.72 0.17 62)"
  amber-deep: "oklch(0.52 0.12 58)"
  on-amber: "oklch(0.23 0.045 58)"
  pass-cobalt: "oklch(0.48 0.16 262)"
  pass-mint: "oklch(0.84 0.12 165)"
  pass-lilac: "oklch(0.8 0.09 300)"
  focus: "oklch(0.52 0.16 262)"
  danger: "oklch(0.5 0.17 27)"
typography:
  display:
    fontFamily: "Anybody (variable, wdth 50–150), Arial Narrow, system-ui, sans-serif"
    fontSize: "clamp(2.1rem, 2.6vw + 1rem, 3.4rem)"
    fontWeight: 800
    lineHeight: 1.03
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Anybody"
    fontSize: "clamp(1.5rem, 1vw + 1.1rem, 2rem)"
    fontWeight: 800
    fontStretch: "115%"
    lineHeight: 1.1
  body:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
  data:
    fontFamily: "Atkinson Hyperlegible Mono, ui-monospace, monospace"
    fontSize: "0.75rem"
    fontWeight: 600
    letterSpacing: "0.08em"
rounded:
  input: "10px"
  card: "14px"
  pass: "16px"
  pill: "999px"
components:
  button-primary:
    backgroundColor: "{colors.amber}"
    textColor: "{colors.on-amber}"
    rounded: "{rounded.pill}"
    minHeight: "48px"
  button-primary-hover:
    backgroundColor: "{colors.amber-hover}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    border: "1.5px solid {colors.ink}"
    rounded: "{rounded.pill}"
  student-pass-card:
    backgroundColor: "{colors.amber}"
    textColor: "{colors.on-amber}"
    rounded: "{rounded.card}"
    aspectRatio: "85.6 / 54"
  category-pass:
    rounded: "{rounded.pass}"
    minHeight: "132px"
    stackOverlap: "-72px"
---

# Design System: StudentStack

## Scope

This system covers the **homepage** (`/`) and **Add a perk** (`/submit`). It lives in
`src/components/home/brand.module.css` (tokens + components) and `src/lib/fonts.ts`
(type). `/directory`, the preset pages, and `/admin` still use the earlier
"photocopied flyer" tokens in `src/app/globals.css` until they are restyled.

## 1. Overview

**Creative North Star: "The Student Pass"**

A student ID is the object that unlocks every offer in the directory, so the
homepage leads with one: an amber card at real ID-1 proportions that flips to show
the categories it opens. Everything around it is quiet: pure white (or neutral
near-black) ground, dark warm ink, one amber accent. The only moment of fuller
color is the category wallet, where each category is a colored pass tucked into a
stack like a phone wallet.

The voice is still a senior student handing over the real list (see `PRODUCT.md`):
plainspoken, specific, no invented activity. It rejects the generic SaaS template
and the meme/sticker look, and it replaced the earlier photocopied-flyer homepage.

## 2. Colors

Committed strategy: amber carries the card and every call to action; everything
else is neutral. Light ground is pure `#ffffff`; dark ground is chroma-0 near-black.

- **Amber** (`oklch(0.774 0.174 65.1)`): the card, primary buttons, "Free" cost pills.
- **On-amber** (`oklch(0.23 0.045 58)`): text on amber, and the card's back face. 8.3:1 on amber.
- **Amber-deep** (`oklch(0.52 0.12 58)` light / `oklch(0.8 0.13 68)` dark): amber-toned text on the ground (the headline's live count, step numbers).
- **Ink / muted** (`oklch(0.21 …)` / `oklch(0.47 …)`): body text and secondary text. Muted is 6.8:1 on white, 7.8:1 in dark mode.
- **Pass colors** (cobalt, mint, lilac): category passes only, cycling with amber. White text on cobalt 6.5:1; dark ink on mint and lilac.
- **Danger** (`oklch(0.5 0.17 27)`): form errors only.

### Named Rules
**The One Amber Rule.** Amber marks the card and actions. The three pass colors never leave the category wallet.

**The Real Numbers Rule.** Every count on the page (live offers, category counts, the link-check date) comes from the database at request time. No placeholder stats, no "trending" or "closing soon" sections until that data exists.

## 3. Typography

- **Display: Anybody**, a variable face with a width axis. Headlines at normal width; the card issuer and wordmark at 150% (wide, ID-card lettering); numbers at 54–62% (condensed, like a printed serial).
- **Body: Atkinson Hyperlegible Next**, designed for legibility; carries everything people read.
- **Data: Atkinson Hyperlegible Mono**, used only for small uppercase data labels (card fields, cost pills, pass footers, the card's machine-readable line). Not a general-purpose "technical" voice.

Headings use `text-wrap: balance`; body copy is capped around 40–46ch.

## 4. Elevation

Flat by default. Two exceptions, both physical objects:
- **The card**: a soft drop shadow plus a faint top highlight, no border.
- **Category passes**: a short upward shadow so each pass reads as tucked under the next.

## 5. Components

### Student pass card (`id-card.tsx`)
- ID-1 aspect ratio (85.6 × 54 mm), sized with container query units so it scales as one object.
- Front: issuer, "Student pass", monogram block, Holder / Valid / Unlocks fields (Unlocks = live count), decorative barcode, machine-readable line.
- Back: "Access zones", the top 8 categories with counts, "+ N more zones inside".
- Flips on click or with the "Flip the card" button (`aria-pressed`); the hidden face is `aria-hidden`.

### Category wallet
- Categories sorted by count, chunked into stacks of 5. Each pass is a link to `/directory?category=…`.
- Passes overlap by 72px, leaving a 60px tap target (name + count). Hover/focus lifts a pass 10px.

### Offer rows
- Name, tagline and a cost pill (amber for Free, outlined otherwise), linking into the directory search. Featured slugs are looked up live and dropped if unapproved or broken.

### Forms (`/submit`)
- Visible labels, a hint above each field, errors below with `aria-describedby`; server-side validation returns field-level messages.
- 48px inputs, 10px radius; primary action is the amber pill.

## 6. Motion

- Card settles in once on load (700ms, ease-out-quint); flip is 700ms; pass lift 280ms.
- Everything is disabled under `prefers-reduced-motion`. Content is visible at rest; nothing waits on an entrance animation.

## 7. Do's and Don'ts

### Do:
- **Do** keep the card as the single illustrative object on the page.
- **Do** pull every number from the live data.
- **Do** design both themes through the tokens on `.root` and `:global(.dark) .root`.

### Don't:
- **Don't** add a grid of identical icon cards; categories are a stacked wallet.
- **Don't** add tracked uppercase eyebrows above section headings.
- **Don't** use a cream or warm-tinted page background; warmth comes from the amber.
- **Don't** show submitter names or emails anywhere public.
- **Don't** reach for reflex fonts (Inter, Space Grotesk, IBM Plex, Fraunces and similar).
