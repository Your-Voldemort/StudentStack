import styles from "@/components/home/brand.module.css";
import { SiteFooter, SiteHeader } from "@/components/home/site-chrome";
import { PassCardSkeleton, WordmarkShimmerLoader } from "@/components/home/student-loaders";
import { passFontVariables } from "@/lib/fonts";

export default function Loading() {
  return (
    <div
      className={`${passFontVariables} ${styles.root}`}
      role="status"
      aria-busy="true"
      aria-label="Loading StudentStack homepage"
    >
      <SiteHeader />

      <main>
        <section className={`${styles.wrap} ${styles.hero}`}>
          <div className="py-4 w-full flex flex-col items-center">
            <WordmarkShimmerLoader />
          </div>

          <div className={styles.cardStage}>
            <div className={styles.sleeveWrapper}>
              <div className={styles.sleeveSpotlight} aria-hidden="true" />
              <div className={styles.cardWrapper}>
                <PassCardSkeleton />
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
