import Link from "next/link";
import { getCategoriesWithCounts, getResourceCount } from "@/lib/resources";

// Illustrative only — a fixed, hand-picked slice of the real dataset for the
// hero's card stack. Not a live query: swap these five if the roster changes.
const HERO_CARDS = [
  { icon: "🤖", name: "GitHub Copilot", tagline: "Free Copilot Student plan", dot: "bg-marigold" },
  { icon: "🎨", name: "Adobe Creative Cloud", tagline: "4 months free + 71% off", dot: "bg-navy" },
  { icon: "☁️", name: "Azure for Students", tagline: "$100 credit, no card needed", dot: "bg-sage" },
  { icon: "⚡", name: "Notion", tagline: "Free Plus plan + AI trial", dot: "bg-marigold" },
  { icon: "🛠️", name: "JetBrains", tagline: "All IDEs free (worth $299/yr)", dot: "bg-marigold" },
] as const;

const HERO_TRANSFORMS = [
  "rotate-[-14deg] translate-x-[-64px] translate-y-[18px]",
  "rotate-[-7deg] translate-x-[-32px] translate-y-[2px]",
  "rotate-[2deg] translate-x-[2px] translate-y-[-10px]",
  "rotate-[9deg] translate-x-[36px] translate-y-[0px]",
  "rotate-[16deg] translate-x-[70px] translate-y-[16px]",
];

const STEPS = [
  {
    n: "01",
    title: "Filter by what you need",
    body: "Category, tag, region, cost type — combine them, or just search. No scrolling through 593 rows one tab at a time.",
  },
  {
    n: "02",
    title: "Check it's still live",
    body: "Every card shows when it was last verified, so a dead link doesn't cost you ten minutes before you notice.",
  },
  {
    n: "03",
    title: "Claim it before it's gone",
    body: "Open the official page and claim it directly. Region-gated offers are flagged, not hidden, so you're never guessing.",
  },
];

export default function Home() {
  const categories = getCategoriesWithCounts();
  const resourceCount = getResourceCount();

  return (
    <div className="bg-paper text-ink flex flex-1 flex-col">
      <header className="border-line/80 border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <span className="font-display text-lg font-bold tracking-tight">StudentStack</span>
          <Link
            href="/directory"
            className="border-ink/15 hover:bg-ink hover:text-paper rounded-md border px-4 py-2 text-sm font-medium transition-colors"
          >
            Browse directory
          </Link>
        </div>
      </header>

      <section className="mx-auto grid w-full max-w-6xl gap-16 px-6 pt-16 pb-24 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:pt-24 lg:pb-32">
        <div>
          <h1 className="font-display text-[2.6rem] leading-[1.08] tracking-tight sm:text-6xl">
            What being a student is actually worth.
          </h1>
          <p className="text-ink/70 mt-6 max-w-md text-lg leading-relaxed">
            Free software, cloud credits, scholarships, and discounts — one
            directory, filtered to what you can actually use.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-5">
            <Link
              href="/directory"
              className="bg-ink text-paper hover:bg-navy rounded-md px-6 py-3 text-sm font-medium transition-colors"
            >
              Browse the directory
            </Link>
            <span className="text-ink/65 font-display text-sm">
              {resourceCount} resources · {categories.length} categories
            </span>
          </div>
        </div>

        <div className="relative h-[280px] overflow-hidden sm:h-[320px] sm:overflow-visible" aria-hidden>
          {HERO_CARDS.map((card, i) => (
            <div
              key={card.name}
              style={{ zIndex: i }}
              className={`border-line bg-paper absolute top-1/2 left-1/2 w-56 -translate-x-1/2 -translate-y-1/2 rounded-lg border p-4 shadow-[0_10px_30px_-6px_rgba(20,23,31,0.22)] ${HERO_TRANSFORMS[i]}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xl">{card.icon}</span>
                <span className={`h-2 w-2 rounded-full ${card.dot}`} />
              </div>
              <p className="font-display mt-3 text-sm font-bold">{card.name}</p>
              <p className="text-ink/65 mt-1 text-xs leading-snug">{card.tagline}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-line/80 border-t">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="font-display text-3xl tracking-tight">What&apos;s actually in here</h2>
          <p className="text-ink/60 mt-2 max-w-lg">
            Fifteen categories, pulled straight from the live directory — not
            a preview number, the real count.
          </p>
          <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {categories.map((c) => (
              <Link
                key={c.slug}
                href={`/directory?category=${c.slug}`}
                className="border-line hover:border-ink/40 rounded-lg border p-4 transition-colors"
              >
                <span className="text-2xl">{c.icon}</span>
                <p className="mt-3 text-sm font-medium">{c.name}</p>
                <p className="font-display text-ink/65 mt-1 text-xs">{c.count}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="border-line/80 border-t">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="font-display text-3xl tracking-tight">How to actually use this</h2>
          <div className="mt-10 grid gap-10 sm:grid-cols-3">
            {STEPS.map((step) => (
              <div key={step.n}>
                <p className="font-display text-marigold text-3xl font-bold">{step.n}</p>
                <h3 className="mt-3 text-base font-semibold">{step.title}</h3>
                <p className="text-ink/60 mt-2 text-sm leading-relaxed">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-line/80 mt-auto border-t">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-10 sm:flex-row sm:items-center sm:justify-between">
          <span className="font-display text-sm font-bold">StudentStack</span>
          <Link href="/directory" className="text-ink/60 hover:text-ink text-sm">
            Browse the directory
          </Link>
        </div>
      </footer>
    </div>
  );
}
