"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import styles from "./brand.module.css";

type Zone = { name: string; count: number };

const MetallicCard3D = dynamic(
  () => import("./metallic-card-3d").then((mod) => mod.MetallicCard3D),
  {
    ssr: false,
    loading: () => (
      <div
        className={styles.canvasContainer}
        style={{
          borderRadius: 14,
          background: "linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.01))",
        }}
      />
    ),
  }
);

export function IdCard({
  live,
  categoryCount,
  zones,
  moreZones,
  year,
}: {
  live: number;
  categoryCount: number;
  zones: Zone[];
  moreZones: number;
  year: number;
}) {
  const [flipped, setFlipped] = useState(false);
  const toggle = () => setFlipped((v) => !v);

  return (
    <div className={styles.cardStage}>
      <div className={styles.sleeveWrapper}>
        <div className={styles.sleeveSpotlight} aria-hidden="true" />
        <div className={styles.cardWrapper}>
          <MetallicCard3D
            live={live}
            categoryCount={categoryCount}
            zones={zones}
            moreZones={moreZones}
            year={year}
            flipped={flipped}
            onToggleFlip={toggle}
          />
        </div>
        <picture>
          <source media="(max-width: 640px)" srcSet="/images/leather-sleeve-mobile.webp" type="image/webp" />
          <source srcSet="/images/leather-sleeve.webp" type="image/webp" />
          <img
            src="/images/leather-sleeve.png"
            alt="StudentStack leather sleeve cover"
            className={styles.sleeveOverlay}
            width={490}
            height={181}
            loading="eager"
            decoding="async"
            aria-hidden="true"
          />
        </picture>
      </div>
    </div>
  );
}
