"use client";

import { useState } from "react";
import styles from "./brand.module.css";

type Zone = { name: string; count: number };

// Deterministic bar pattern derived from the text, so server and client render
// identical markup. Decorative only: it doesn't encode a real symbology.
function barcode(text: string) {
  const bars: { x: number; width: number }[] = [];
  let x = 0;
  for (const char of text) {
    const code = char.charCodeAt(0);
    for (let i = 0; i < 4; i++) {
      const width = ((code >> i) & 1) + 1 + ((code >> (i + 4)) & 1);
      bars.push({ x, width });
      x += width + ((code >> (7 - i)) & 1) + 1;
    }
  }
  return { bars, total: x };
}

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
  const toggle = () => setFlipped((value) => !value);
  const serial = String(live).padStart(4, "0");
  const { bars, total } = barcode(`STUDENTSTACK${serial}`);

  return (
    <div className={styles.cardStage}>
      <div className={styles.cardTilt}>
        <div className={`${styles.idCard} ${flipped ? styles.isFlipped : ""}`} onClick={toggle}>
          <div className={`${styles.face} ${styles.front}`} aria-hidden={flipped}>
            <div className={styles.cardTop}>
              <span className={styles.issuer}>StudentStack</span>
              <span className={styles.cardType}>Student pass</span>
            </div>
            <div className={styles.cardBody}>
              <div className={styles.photo} aria-hidden="true">
                S
              </div>
              <dl className={styles.fields}>
                <div>
                  <dt>Holder</dt>
                  <dd>You</dd>
                </div>
                <div>
                  <dt>Valid</dt>
                  <dd>While enrolled</dd>
                </div>
                <div>
                  <dt>Unlocks</dt>
                  <dd>{live} live offers</dd>
                </div>
              </dl>
            </div>
            <div className={styles.barcodeRow}>
              <svg
                className={styles.barcode}
                viewBox={`0 0 ${total} 40`}
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                {bars.map((bar) => (
                  <rect key={bar.x} x={bar.x} y={0} width={bar.width} height={40} fill="currentColor" />
                ))}
              </svg>
              <span className={styles.serial}>
                No. {serial} · {year}
              </span>
            </div>
            <p className={styles.mrz} aria-hidden="true">
              {`P<STUDENTSTACK<<${live}<LIVE<<${categoryCount}<CATEGORIES<<`}
            </p>
          </div>

          <div className={`${styles.face} ${styles.back}`} aria-hidden={!flipped}>
            <p className={styles.backTitle}>Access zones</p>
            <ul className={styles.zones}>
              {zones.map((zone) => (
                <li key={zone.name}>
                  <span>{zone.name}</span>
                  <span className={styles.zoneCount}>{zone.count}</span>
                </li>
              ))}
            </ul>
            {moreZones > 0 && <p className={styles.backFoot}>+ {moreZones} more zones inside</p>}
          </div>
        </div>
      </div>
      <button type="button" className={styles.flip} aria-pressed={flipped} onClick={toggle}>
        {flipped ? "Flip to the front" : "Flip the card"}
      </button>
    </div>
  );
}
