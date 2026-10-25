import Link from "next/link";
import styles from "@/components/home/brand.module.css";
import { IdCard } from "@/components/home/id-card";
import { SiteFooter, SiteHeader } from "@/components/home/site-chrome";
import { HomePreloader } from "@/components/home/student-loaders";
import { passFontVariables } from "@/lib/fonts";
import { getCategoriesWithCounts, getHomeStats, getLiveCostTypeCounts, getPopularThisWeek, getResourcesBySlugs } from "@/lib/resources";
import { heroLede } from "@/lib/home-copy";

// See src/app/directory/page.tsx for why this is force-dynamic rather than
// relying on revalidatePath to refresh a statically prerendered page.
export const dynamic = "force-dynamic";

// Hand-picked, but looked up live: a pick that gets renamed, unapproved or
// flagged broken drops out instead of showing stale copy.
const FEATURED_SLUGS = ["github-copilot", "jetbrains", "figma", "aws-free-tier", "spotify-premium-student"];

const PASS_COLORS = [styles.amber, styles.cobalt, styles.mint, styles.lilac];
const PASSES_PER_STACK = 5;

const COST_LABELS = {
  free: "Free",
  discount: "Discount",
  credits: "Credits",
  trial: "Trial",
  scholarship: "Scholarship",
  stipend: "Stipend",
} as const;

export default async function Home() {
  const [stats, categories, featured, popular, costCounts] = await Promise.all([
    getHomeStats(),
    getCategoriesWithCounts(),
    getResourcesBySlugs(FEATURED_SLUGS),
    getPopularThisWeek(5),
    getLiveCostTypeCounts(),
  ]);

  // "Popular this week" is backed by real 7-day click data (issue #77);
  // when nothing was clicked this week we fall back to the curated picks
  // rather than showing popularity with no data behind it.
  const showPopular = popular.length > 0;
  const offers = showPopular ? popular : featured;

  const zones = categories.slice(0, 8).map(({ name, count }) => ({ name, count }));
  const stacks = Array.from({ length: Math.ceil(categories.length / PASSES_PER_STACK) }, (_, i) =>
    categories.slice(i * PASSES_PER_STACK, (i + 1) * PASSES_PER_STACK),
  );

  return (
    <div className={`${passFontVariables} ${styles.root}`}>
      <HomePreloader live={stats.live} categoryCount={categories.length} />
      <SiteHeader total={stats.total} />

      <main>
        <section className={`${styles.wrap} ${styles.hero}`}>
          <h1 className={styles.headline}>
            Being a student <br className="hidden md:inline" />
            unlocks <span className={styles.num}>{stats.live}</span> live offers. <br className="hidden md:inline" />
            Here’s the whole list.
          </h1>
          <p className={styles.lede}>
            {heroLede(costCounts)}
          </p>
          <form action="/directory" method="GET" role="search" className={styles.search}>
            <label htmlFor="home-search" className="sr-only">
              Search offers
            </label>
            <input id="home-search" type="search" name="q" placeholder={`Search ${stats.total} offers...`} />
            <button type="submit">Search</button>
          </form>

          <p className={styles.scrollHint}>Scroll to reveal your student pass ↓</p>

          <IdCard
            live={stats.live}
            categoryCount={categories.length}
            zones={zones}
            moreZones={categories.length - zones.length}
            year={new Date().getUTCFullYear()}
          />
        </section>

        {offers.length > 0 && (
          <section className={styles.section}>
            <div className={`${styles.wrap} ${styles.split}`}>
              <div>
                <h2 className={styles.sectionTitle}>{showPopular ? "Popular this week" : "A few things this pass opens"}</h2>
                <p className={styles.sectionLede}>{showPopular ? "The most-clicked live offers of the last 7 days." : "Straight from the directory, tagline for tagline."}</p>
                <Link href="/directory" className={styles.textLink}>
                  See all {stats.total}
                </Link>
              </div>
              <ul className={styles.offers}>
                {offers.map((offer) => (
                  <li key={offer.slug}>
                    <Link href={`/directory?q=${encodeURIComponent(offer.name)}`} className={styles.offerRow}>
                      <span className={styles.offerName}>{offer.name}</span>
                      {offer.tagline && <span className={styles.offerTag}>{offer.tagline}</span>}
                      <span className={`${styles.cost} ${offer.costType === "free" ? styles.costFree : ""}`}>
                        {COST_LABELS[offer.costType]}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        <section className={styles.section} aria-labelledby="passes-title">
          <div className={styles.wrap}>
            <h2 id="passes-title" className={styles.sectionTitle}>
              Pick a pass
            </h2>
            <p className={styles.sectionLede}>
              All {categories.length} categories, with how many offers each one holds.
            </p>
            <div className={styles.stacks}>
              {stacks.map((stack, stackIndex) => (
                <div key={stackIndex} className={styles.stack}>
                  {stack.map((category, i) => (
                    <Link
                      key={category.slug}
                      href={`/directory?category=${category.slug}`}
                      className={`${styles.pass} ${PASS_COLORS[(stackIndex * PASSES_PER_STACK + i) % PASS_COLORS.length]}`}
                    >
                      <span className={styles.passTop}>
                        <span className={styles.passName}>{category.name}</span>
                        <span className={styles.passCount}>{category.count}</span>
                      </span>
                      <span className={styles.passFoot}>
                        <span>Open list</span>
                        <span aria-hidden="true">→</span>
                      </span>
                    </Link>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className={`${styles.section} ${styles.contribute}`}>
          <div className={`${styles.wrap} ${styles.split}`}>
            <div>
              <h2 className={styles.sectionTitle}>Found one we’re missing?</h2>
              <p className={styles.sectionLede}>
                Students add offers here. Nothing goes live until it’s been checked.
              </p>
              <Link href="/submit" className={styles.cta}>
                Add a perk
              </Link>
            </div>
            <ol className={styles.steps}>
              <li>Sign in with Google or an email link.</li>
              <li>Paste the offer’s link and pick its category.</li>
              <li>It goes live once it’s reviewed.</li>
            </ol>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
