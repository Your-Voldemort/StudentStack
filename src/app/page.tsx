import type { CSSProperties } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Big_Shoulders, Public_Sans } from "next/font/google";
import { getCategoriesWithCounts, getResourceCount } from "@/lib/resources";

// See src/app/directory/page.tsx for why this is force-dynamic rather than
// relying on revalidatePath to refresh a statically prerendered page.
export const dynamic = "force-dynamic";

const bigShoulders = Big_Shoulders({
  variable: "--font-display",
  weight: ["700", "800", "900"],
  subsets: ["latin"],
});

const publicSans = Public_Sans({
  variable: "--font-body-brand",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
});

// Illustrative only — a fixed, hand-picked slice of the real dataset for the
// hero's stamped-card stack. Not a live query: swap these five if the roster
// changes.
const HERO_CARDS = [
  { icon: "🤖", name: "GitHub Copilot", tagline: "Free Copilot Student plan", tag: "Free" },
  { icon: "🎨", name: "Adobe Creative Cloud", tagline: "4 months free + 71% off", tag: "Discount" },
  { icon: "☁️", name: "Azure for Students", tagline: "$100 credit, no card needed", tag: "Credit" },
  { icon: "⚡", name: "Notion", tagline: "Free Plus plan + AI trial", tag: "Free" },
  { icon: "🛠️", name: "JetBrains", tagline: "All IDEs free (worth $299/yr)", tag: "Free" },
] as const;

// Final resting position for each fanned card: rotation + offset from center.
const HERO_CARD_STYLE = [
  { rot: "-14deg", tx: "-64px", ty: "18px" },
  { rot: "-7deg", tx: "-32px", ty: "2px" },
  { rot: "2deg", tx: "2px", ty: "-10px" },
  { rot: "9deg", tx: "36px", ty: "0px" },
  { rot: "16deg", tx: "70px", ty: "16px" },
] as const;

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

export default async function Home() {
  const categories = await getCategoriesWithCounts();
  const resourceCount = await getResourceCount();
  const half = Math.ceil(categories.length / 2);
  const columns = [categories.slice(0, half), categories.slice(half)];

  return (
    <div
      className={`${bigShoulders.variable} ${publicSans.variable} bg-bg text-ink font-body-brand flex flex-1 flex-col`}
    >
      <header className="border-line border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <span className="font-display text-xl font-black tracking-tight uppercase">
            StudentStack
          </span>
          <Link
            href="/directory"
            className="border-ink hover:bg-ink hover:text-bg inline-flex min-h-11 items-center rounded-[3px] border px-4 py-2 text-sm font-medium transition-colors"
          >
            Browse directory
          </Link>
        </div>
      </header>

      <section className="mx-auto grid w-full max-w-6xl gap-16 px-6 pt-16 pb-24 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:pt-24 lg:pb-32">
        <div className="hero-in">
          <h1 className="font-display text-balance text-[2.75rem] leading-[1.05] tracking-tight uppercase sm:text-6xl">
            What being a student is actually worth.
          </h1>
          <p className="text-ink-muted mt-6 max-w-[42ch] text-lg leading-relaxed text-pretty">
            Free software, cloud credits, scholarships, and discounts — one
            directory, filtered to what you can actually use.
          </p>

          <form
            action="/directory"
            method="GET"
            role="search"
            aria-label="Search the directory"
            className="border-ink focus-within:ring-orange mt-8 flex max-w-md rounded-[3px] border bg-bg focus-within:ring-2"
          >
            <input
              type="search"
              name="q"
              placeholder={`Search ${resourceCount} resources… try "aws" or "certification"`}
              className="text-ink placeholder:text-ink-muted min-w-0 flex-1 bg-transparent px-4 py-3 text-sm outline-none"
            />
            <button
              type="submit"
              aria-label="Search"
              className="border-ink hover:bg-ink hover:text-bg inline-flex min-h-11 shrink-0 cursor-pointer items-center border-l px-4 transition-colors"
            >
              <Search className="h-4 w-4" aria-hidden />
            </button>
          </form>

          <div className="mt-6 flex flex-wrap items-center gap-5">
            <Link
              href="/directory"
              className="bg-orange text-ink hover:bg-orange-deep hover:text-bg rounded-[3px] px-6 py-3 text-sm font-bold uppercase tracking-wide transition-colors"
            >
              Browse the directory
            </Link>
            <span className="text-ink-muted text-sm">
              {resourceCount} resources · {categories.length} categories
            </span>
          </div>
        </div>

        <div className="relative h-[280px] overflow-hidden sm:h-[320px] sm:overflow-visible" aria-hidden>
          {HERO_CARDS.map((card, i) => {
            const style = HERO_CARD_STYLE[i];
            return (
              <div
                key={card.name}
                style={
                  {
                    zIndex: i,
                    "--rot": style.rot,
                    "--tx": style.tx,
                    "--ty": style.ty,
                    animationDelay: `${300 + i * 90}ms`,
                  } as CSSProperties
                }
                className="fan-card border-ink bg-bg absolute top-1/2 left-1/2 w-56 rounded-[4px] border p-4 shadow-[6px_6px_0_#111418]"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xl">{card.icon}</span>
                  <span className="font-display text-ink-muted text-[10px] font-bold tracking-wide uppercase">
                    {card.tag}
                  </span>
                </div>
                <p className="font-display mt-3 text-base font-bold tracking-tight uppercase">
                  {card.name}
                </p>
                <p className="text-ink-muted mt-1 text-xs leading-snug">{card.tagline}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="border-line border-t">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="font-display text-balance text-3xl tracking-tight uppercase">
            What&apos;s actually in here
          </h2>
          <p className="text-ink-muted mt-2 max-w-[55ch] text-pretty">
            Fifteen categories, pulled straight from the live directory — not
            a preview number, the real count.
          </p>
          <div className="mt-10 grid gap-x-12 md:grid-cols-2">
            {columns.map((col, colIdx) => (
              <div key={colIdx}>
                {col.map((c) => (
                  <Link
                    key={c.slug}
                    href={`/directory?category=${c.slug}`}
                    className="hover:bg-panel border-line -mx-2 flex items-baseline gap-3 border-b px-2 py-4 transition-colors last:border-b-0"
                  >
                    <span className="w-7 shrink-0 text-xl">{c.icon}</span>
                    <span className="font-display text-lg tracking-tight uppercase">
                      {c.name}
                    </span>
                    <span className="border-line mx-1 h-px flex-1 border-b border-dotted" aria-hidden />
                    <span className="font-display text-orange-deep text-2xl tabular-nums">
                      {c.count}
                    </span>
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-orange">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="font-display text-balance text-3xl tracking-tight uppercase">
            How to actually use this
          </h2>
          <div className="mt-10 grid gap-10 sm:grid-cols-3">
            {STEPS.map((step) => (
              <div key={step.n}>
                <p className="font-display text-5xl font-black">{step.n}</p>
                <h3 className="mt-3 text-base font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-pretty">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-line mt-auto border-t">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-10 sm:flex-row sm:items-center sm:justify-between">
          <span className="font-display text-sm font-black uppercase">StudentStack</span>
          <Link
            href="/directory"
            className="text-ink-muted hover:text-ink inline-flex min-h-11 items-center text-sm"
          >
            Browse the directory
          </Link>
        </div>
      </footer>
    </div>
  );
}
