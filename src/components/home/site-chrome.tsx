"use client";

import { useState } from "react";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { Menu, X } from "lucide-react";
import styles from "./brand.module.css";

export function SiteHeader({}: { total?: number } = {}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className={styles.bar}>
      <div className={`${styles.wrap} ${styles.barInner}`}>
        <Link href="/" className={styles.wordmark}>
          StudentStack
        </Link>
        <nav aria-label="Main" className={styles.nav} data-has-theme-toggle>
          <div className={styles.desktopLinks}>
            <Link href="/directory" className={styles.navLink}>
              Directory
            </Link>
            <a href="#passes-title" className={styles.navLink}>
              How it works
            </a>
            <a href="#passes-title" className={styles.navLink}>
              FAQs
            </a>
          </div>
          <Link href="/submit" className={styles.pillLink}>
            Add a perk
          </Link>
          <ThemeToggle />
          <button
            type="button"
            className={styles.mobileMenuBtn}
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </nav>
      </div>

      {menuOpen && (
        <div className={styles.mobileMenuDropdown}>
          <Link
            href="/directory"
            className={styles.mobileMenuLink}
            onClick={() => setMenuOpen(false)}
          >
            Directory
          </Link>
          <a
            href="#passes-title"
            className={styles.mobileMenuLink}
            onClick={() => setMenuOpen(false)}
          >
            How it works
          </a>
          <a
            href="#passes-title"
            className={styles.mobileMenuLink}
            onClick={() => setMenuOpen(false)}
          >
            FAQs
          </a>
        </div>
      )}
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
