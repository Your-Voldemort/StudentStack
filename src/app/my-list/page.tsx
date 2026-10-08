import { Metadata } from "next";
import { SiteHeader, SiteFooter } from "@/components/home/site-chrome";
import { passFontVariables } from "@/lib/fonts";
import { MyListClient } from "./my-list-client";
import styles from "./my-list.module.css";

export const metadata: Metadata = {
  title: "My List | StudentStack",
  description: "Track your bookmarked scholarships, internships, and opportunities.",
};

export default function MyListPage() {
  return (
    <div className={`${passFontVariables} ${styles.root}`}>
      <SiteHeader />
      <main className={styles.wrap}>
        <header className={styles.header}>
          <h1 className={styles.title}>My List</h1>
          <p className={styles.subtitle}>
            Your saved opportunities. Track application status from interested to got it.
          </p>
        </header>
        <MyListClient />
      </main>
      <SiteFooter />
    </div>
  );
}