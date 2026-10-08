"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { Menu, X } from "lucide-react";
import styles from "./brand.module.css";

export function SiteHeader({}: { total?: number } = {}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled((window.scrollY || document.documentElement.scrollTop) > 25);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!navRef.current) return;
    const rect = navRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    navRef.current.style.setProperty("--sheen-x", `${x}%`);
    navRef.current.style.setProperty("--sheen-y", `${y}%`);
  };

  return (
    <header className={`${styles.bar} ${scrolled ? styles.barScrolled : ""}`}>
      <div
        ref={navRef}
        onMouseMove={handleMouseMove}
        className={`${styles.wrap} ${styles.barInner} ${scrolled ? styles.capsule : ""}`}
      >
        <div className={styles.liquidSheen} aria-hidden="true" />
        <Link href="/" className={styles.wordmark}>
          StudentStack
        </Link>
<nav aria-label="Main" className={styles.nav} data-has-theme-toggle>
            <div className={styles.desktopLinks}>
              <Link href="/directory" className={styles.navLink}>
                Directory
              </Link>
              <Link href="/deadlines" className={styles.navLink}>
                Deadlines
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
        <div
          className={`${styles.mobileMenuDropdown} ${scrolled ? styles.mobileMenuDropdownFloating : ""}`}
        >
          <Link
            href="/directory"
            className={styles.mobileMenuLink}
            onClick={() => setMenuOpen(false)}
          >
            Directory
          </Link>
          <Link
            href="/deadlines"
            className={styles.mobileMenuLink}
            onClick={() => setMenuOpen(false)}
          >
            Deadlines
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
