"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { LoaderFive } from "@/components/ui/loader";
import styles from "./brand.module.css";

const MIN_LOADER_DURATION_MS = 2500;
const MAX_WAIT_DURATION_MS = 5500;

type ReadyWindow = Window & {
  __studentstackCardReady?: boolean;
  __studentstackLoaderStart?: number;
  __studentstackLoaderProgress?: number;
};

/**
 * Self-animating progress hook when `progress` is not controlled externally
 * (e.g. inside Next.js `src/app/loading.tsx` while server data streams).
 */
function useAutonomousProgress(enabled: boolean) {
  const [autoProgress, setAutoProgress] = useState(0.08);

  useEffect(() => {
    if (!enabled) return;
    let frameId: number;
    const win = window as ReadyWindow;
    const start = win.__studentstackLoaderStart ?? performance.now();
    win.__studentstackLoaderStart = start;

    const tick = (now: number) => {
      const elapsed = now - start;
      // Asymptotically approaches 0.92 while waiting for server stream
      const value = 0.08 + 0.84 * (1 - Math.exp(-elapsed / 1400));
      win.__studentstackLoaderProgress = value;
      setAutoProgress(value);
      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [enabled]);

  return autoProgress;
}

/**
 * Minimal Wordmark Shimmer Loader (@aceternity/loader LoaderFive + Dynamic Live Telemetry)
 */
export function WordmarkShimmerLoader({
  live,
  categoryCount,
  progress,
  hydrated = true,
  statusText,
}: {
  live?: number;
  categoryCount?: number;
  progress?: number;
  hydrated?: boolean;
  statusText?: string;
}) {
  const autoProgress = useAutonomousProgress(progress === undefined);
  const effectiveProgress = Math.min(
    Math.max(progress ?? autoProgress, 0),
    1,
  );
  const percent = Math.round(effectiveProgress * 100);

  const animatedOfferCount =
    typeof live === "number"
      ? hydrated
        ? Math.max(1, Math.round(live * Math.max(effectiveProgress, 0.05)))
        : live
      : null;

  const dynamicStageText = useMemo(() => {
    if (statusText) return statusText;
    if (!hydrated || effectiveProgress < 0.35) {
      return typeof live === "number"
        ? `Syncing ${live} live offers`
        : "Syncing live offers";
    }
    if (effectiveProgress < 0.7) {
      return typeof categoryCount === "number"
        ? `Stacking ${categoryCount} pass zones`
        : "Stacking pass zones";
    }
    if (effectiveProgress < 0.96) {
      return "Rendering 3D student pass";
    }
    return "Student pass ready";
  }, [statusText, hydrated, effectiveProgress, live, categoryCount]);

  return (
    <div className="w-full max-w-md mx-auto px-4 flex flex-col items-center text-center select-none">
      <style>{`
        @keyframes studentstack-prehydrate-bar {
          0% { width: 8%; }
          50% { width: 52%; }
          100% { width: 82%; }
        }
        @media (prefers-reduced-motion: reduce) {
          [data-studentstack-preloader] {
            display: none !important;
          }
        }
      `}</style>

      <div
        style={{
          background: "oklch(0.774 0.174 65.1)",
          color: "oklch(0.23 0.045 58)",
          fontFamily: "var(--font-pass-mono), monospace",
          fontVariantNumeric: "tabular-nums",
        }}
        className="px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-widest mb-4"
      >
        {animatedOfferCount !== null
          ? `STUDENT PASS · ${animatedOfferCount} LIVE OFFERS`
          : `STUDENT PASS · SYNCING OFFERS`}
      </div>

      <div
        style={{
          fontFamily: "var(--font-pass-display), system-ui, sans-serif",
          fontStretch: "150%",
          fontWeight: 900,
        }}
        className="text-2xl sm:text-4xl tracking-tight uppercase"
      >
        <LoaderFive text="STUDENTSTACK" />
      </div>

      <div className="mt-6 w-56 h-[2px] rounded-full overflow-hidden bg-black/10 dark:bg-white/10">
        <div
          className="h-full rounded-full transition-[width] duration-75 ease-out"
          style={
            hydrated
              ? {
                  width: `${percent}%`,
                  background: "oklch(0.774 0.174 65.1)",
                }
              : {
                  background: "oklch(0.774 0.174 65.1)",
                  animation:
                    "studentstack-prehydrate-bar 3.2s cubic-bezier(0.22, 1, 0.36, 1) forwards",
                }
          }
        />
      </div>

      <div
        style={{
          fontFamily: "var(--font-pass-mono), monospace",
          fontVariantNumeric: "tabular-nums",
        }}
        className="mt-5 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs uppercase tracking-widest opacity-80 min-h-[1.25rem]"
      >
        <span>{dynamicStageText}</span>
        {hydrated && (
          <span className="whitespace-nowrap opacity-70">· {percent}%</span>
        )}
      </div>
    </div>
  );
}

/**
 * Inline 3D Student Pass Skeleton (used while Three.js MetallicCard3D initializes
 * or inside src/app/loading.tsx)
 */
export function PassCardSkeleton({
  live,
  categoryCount,
  year,
}: {
  live?: number;
  categoryCount?: number;
  year?: number;
}) {
  const serial = live ? String(live).padStart(4, "0") : "----";
  const displayYear = year ?? new Date().getUTCFullYear();

  return (
    <div
      className={styles.canvasContainer}
      role="status"
      aria-label="Loading 3D student pass"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "12px",
      }}
    >
      <div
        style={{
          width: "91%",
          aspectRatio: "85.6 / 54",
          borderRadius: 14,
          background:
            "linear-gradient(135deg, #f3f5f8 0%, #e5e9ee 45%, #f8fafc 70%, #dfe4ea 100%)",
          color: "#0f1115",
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.85), 0 22px 40px -22px rgba(0, 0, 0, 0.45)",
        }}
        className="relative flex flex-col justify-between p-4 sm:p-5 overflow-hidden animate-pulse"
      >
        <div
          className="flex items-baseline justify-between pb-2"
          style={{ borderBottom: "2px solid #0f1115" }}
        >
          <span
            style={{
              fontFamily: "var(--font-pass-display), system-ui, sans-serif",
              fontStretch: "150%",
              fontWeight: 900,
            }}
            className="text-xs sm:text-sm uppercase tracking-wider"
          >
            STUDENTSTACK
          </span>
          <span className="font-mono text-[10px] font-bold uppercase tracking-widest">
            STUDENT PASS
          </span>
        </div>

        <div className="flex items-center gap-3.5 my-auto py-1">
          <div className="w-11 sm:w-14 aspect-[3/4] rounded-md bg-[#121316] text-white grid place-items-center font-black text-2xl">
            S
          </div>
          <div className="space-y-1.5 text-left">
            <div className="text-[9px] font-mono font-bold uppercase tracking-widest text-[#1a1d24]">
              HOLDER: You
            </div>
            <div className="text-xs sm:text-sm font-extrabold text-[#050608]">
              {live ? `${live} live offers` : "Loading live offers..."}
            </div>
            <div className="text-[10px] font-mono text-[#2d3036]">
              {categoryCount
                ? `${categoryCount} access zones`
                : "Preparing 3D pass..."}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-[9px] font-mono font-semibold text-[#2d3036] pt-1">
          <span>
            No. {serial} - {displayYear}
          </span>
          <span>INITIALIZING 3D PASS...</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Dynamic Fullscreen Homepage Preloader
 * - Combines real page/font/3D WebGL readiness with a minimum 2.5s-3s duration.
 * - Uses a CSS pre-hydration bar animation on slow networks before JS finishes loading,
 *   then smoothly transitions through live offer & 3D pass readiness milestones.
 */
export function HomePreloader({
  live,
  categoryCount,
}: {
  live: number;
  categoryCount?: number;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const [progress, setProgress] = useState(0.08);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (prefersReducedMotion) {
      const skipId = requestAnimationFrame(() => setIsOpen(false));
      return () => cancelAnimationFrame(skipId);
    }

    let cancelled = false;
    let frameId: number;
    let finishTimer: ReturnType<typeof setTimeout> | undefined;

    const win = window as ReadyWindow;
    const nowAtMount = performance.now();
    const mountTime = win.__studentstackLoaderStart ?? nowAtMount;
    win.__studentstackLoaderStart = mountTime;

    // Seed initial progress based on streaming loader handoff or pre-hydration elapsed time
    const preHydrationElapsed = Math.min(nowAtMount, 1200);
    let currentProgress = Math.max(
      win.__studentstackLoaderProgress ?? 0.08,
      Math.min(0.28, 0.08 + (preHydrationElapsed / 1200) * 0.2),
    );
    let lastTickTime = nowAtMount;

    let windowReady = document.readyState === "complete";
    let fontsReady = false;
    let cardReady = Boolean(win.__studentstackCardReady);
    let completionStartedAt: number | null = null;

    const onWindowLoad = () => {
      windowReady = true;
    };
    const onCardReady = () => {
      cardReady = true;
    };

    if (!windowReady) {
      window.addEventListener("load", onWindowLoad, { once: true });
    }
    window.addEventListener("studentstack:card-ready", onCardReady, {
      once: true,
    });

    if (document.fonts?.ready) {
      document.fonts.ready
        .then(() => {
          fontsReady = true;
        })
        .catch(() => {
          fontsReady = true;
        });
    } else {
      fontsReady = true;
    }

    const tick = (now: number) => {
      if (cancelled) return;

      const dt = Math.min(now - lastTickTime, 80);
      lastTickTime = now;

      const elapsedSinceMount = now - mountTime;
      const minTimeMet = elapsedSinceMount >= MIN_LOADER_DURATION_MS;
      const maxTimeExceeded = elapsedSinceMount >= MAX_WAIT_DURATION_MS;
      const allAssetsReady = windowReady && fontsReady && cardReady;

      if ((minTimeMet && allAssetsReady) || maxTimeExceeded) {
        if (completionStartedAt === null) {
          completionStartedAt = now;
        }
        const finalizeRatio = Math.min((now - completionStartedAt) / 320, 1);
        currentProgress = Math.max(
          currentProgress,
          0.92 + 0.08 * finalizeRatio,
        );
        setHydrated(true);
        setProgress(currentProgress);

        if (finalizeRatio >= 1) {
          finishTimer = setTimeout(() => {
            if (!cancelled) {
              delete win.__studentstackLoaderStart;
              delete win.__studentstackLoaderProgress;
              setIsOpen(false);
            }
          }, 180);
          return;
        }
      } else {
        const timeRatio = Math.min(
          elapsedSinceMount / MIN_LOADER_DURATION_MS,
          1,
        );
        const easedTime = 1 - Math.pow(1 - timeRatio, 1.55);
        const readinessBonus =
          (fontsReady ? 0.04 : 0) +
          (windowReady ? 0.04 : 0) +
          (cardReady ? 0.06 : 0);
        const target = Math.min(0.92, easedTime * 0.78 + readinessBonus);
        // Smooth velocity cap so heavy main-thread frames (like WebGL init) never jump abruptly
        const maxStep = (dt / 1000) * 0.65;
        currentProgress = Math.min(
          0.92,
          Math.max(currentProgress, Math.min(target, currentProgress + maxStep)),
        );
        setHydrated(true);
        setProgress(currentProgress);
      }

      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      cancelAnimationFrame(frameId);
      if (finishTimer) clearTimeout(finishTimer);
      window.removeEventListener("load", onWindowLoad);
      window.removeEventListener("studentstack:card-ready", onCardReady);
    };
  }, []);

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          key="studentstack-preloader"
          data-studentstack-preloader
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
          role="status"
          aria-live="polite"
          aria-label="Loading StudentStack"
          style={{
            background: "var(--ground)",
            color: "var(--ink)",
          }}
          className="fixed inset-0 z-[120] flex flex-col items-center justify-center p-6"
        >
          <div className="w-full max-w-lg">
            <WordmarkShimmerLoader
              live={live}
              categoryCount={categoryCount}
              progress={progress}
              hydrated={hydrated}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
