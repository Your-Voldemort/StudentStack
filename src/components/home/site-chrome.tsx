import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import styles from "./brand.module.css";

export function SiteHeader({ total }: { total?: number }) {
  return (
    <header className={styles.bar}>
      <div className={`${styles.wrap} ${styles.barInner}`}>
        <Link href="/" className={styles.wordmark}>
          StudentStack
        </Link>
        {/* data-has-theme-toggle hides layout.tsx's floating toggle (globals.css). */}
        <nav aria-label="Main" className={styles.nav} data-has-theme-toggle>
          <Link href="/directory" className={styles.navLink}>
            {total ? `Browse all ${total}` : "Browse the directory"}
          </Link>
          <Link href="/submit" className={styles.pillLink}>
            Add a perk
          </Link>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={`${styles.wrap} ${styles.footerInner}`}>
        <Link href="/" className={styles.wordmark}>
          StudentStack
        </Link>
        <nav aria-label="Footer" className={styles.nav}>
          <Link href="/directory" className={styles.navLink}>
            Directory
          </Link>
          <Link href="/submit" className={styles.navLink}>
            Add a perk
          </Link>
        </nav>
      </div>
    </footer>
  );
}
