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
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/leather-sleeve.png"
          alt="StudentStack leather sleeve cover"
          className={styles.sleeveOverlay}
          aria-hidden="true"
        />
      </div>

      <p className={styles.cardHint}>Move to tilt · Click to flip</p>

      <button
        type="button"
        className={styles.flip}
        aria-pressed={flipped}
        onClick={toggle}
      >
        {flipped ? "Flip to the front" : "Flip the card"}
      </button>
    </div>
  );
}
