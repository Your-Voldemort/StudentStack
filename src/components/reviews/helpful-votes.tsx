"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { ThumbsUp } from "lucide-react";
import { setHelpfulVote } from "@/app/reviews/actions";

// "Helpful" votes on /r/[slug] reviews (issue #119). The page renders the
// public counts; this loads the signed-in student's votes once from
// /api/reviews/votes and applies toggles optimistically, rolling back if the
// Server Action fails (same approach as the bookmarks provider).

type Viewer = { signedIn: boolean; voted: number[]; mine: number | null };

type HelpfulVotesContextValue = {
  ready: boolean;
  signedIn: boolean;
  isMine: (reviewId: number) => boolean;
  hasVoted: (reviewId: number) => boolean;
  votedInitially: (reviewId: number) => boolean;
  toggle: (reviewId: number) => Promise<string | null>;
};

const HelpfulVotesContext = createContext<HelpfulVotesContextValue>({
  ready: false,
  signedIn: false,
  isMine: () => false,
  hasVoted: () => false,
  votedInitially: () => false,
  toggle: async () => null,
});

export function HelpfulVotesProvider({ resourceId, children }: { resourceId: number; children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [viewer, setViewer] = useState<Viewer>({ signedIn: false, voted: [], mine: null });
  const [voted, setVoted] = useState<Set<number>>(new Set());

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/reviews/votes?resourceId=${resourceId}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: Viewer | null) => {
        if (cancelled || !data) return;
        setViewer(data);
        setVoted(new Set(data.voted));
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [resourceId]);

  const setOne = useCallback((reviewId: number, on: boolean) => {
    setVoted((current) => {
      const copy = new Set(current);
      if (on) copy.add(reviewId);
      else copy.delete(reviewId);
      return copy;
    });
  }, []);

  const toggle = useCallback(
    async (reviewId: number) => {
      const next = !voted.has(reviewId);
      setOne(reviewId, next);
      const result = await setHelpfulVote(reviewId, next).catch(() => ({
        ok: false as const,
        error: "We couldn’t save your vote. Try again.",
      }));
      if (result.ok) return null;
      setOne(reviewId, !next);
      return result.error;
    },
    [voted, setOne],
  );

  const value = useMemo<HelpfulVotesContextValue>(
    () => ({
      ready,
      signedIn: viewer.signedIn,
      isMine: (reviewId) => viewer.mine === reviewId,
      hasVoted: (reviewId) => voted.has(reviewId),
      votedInitially: (reviewId) => viewer.voted.includes(reviewId),
      toggle,
    }),
    [ready, viewer, voted, toggle],
  );

  return <HelpfulVotesContext.Provider value={value}>{children}</HelpfulVotesContext.Provider>;
}

const buttonClass =
  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors disabled:opacity-60";

// `count` is the server-rendered total, which already includes the
// student's own vote if they had one when the page loaded.
export function HelpfulButton({ reviewId, count }: { reviewId: number; count: number }) {
  const { ready, signedIn, isMine, hasVoted, votedInitially, toggle } = useContext(HelpfulVotesContext);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const voted = hasVoted(reviewId);
  const shown = count - (votedInitially(reviewId) ? 1 : 0) + (voted ? 1 : 0);
  const label = `Helpful (${shown})`;

  if (ready && !signedIn) {
    return (
      <Link
        href="/my-list"
        className={`${buttonClass} border-border text-muted-foreground hover:text-foreground`}
        aria-label={`${label}. Sign in to mark this review as helpful`}
      >
        <ThumbsUp className="size-3.5" aria-hidden />
        {label}
      </Link>
    );
  }

  // Authors see the count on their own review but can't vote on it.
  if (isMine(reviewId)) {
    return (
      <span className={`${buttonClass} border-border/60 text-muted-foreground`} title="This is your review">
        <ThumbsUp className="size-3.5" aria-hidden />
        {label}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        disabled={!ready || pending}
        aria-pressed={voted}
        onClick={() => {
          setError(null);
          setPending(true);
          void toggle(reviewId).then((message) => {
            setError(message);
            setPending(false);
          });
        }}
        className={`${buttonClass} ${
          voted ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:text-foreground"
        }`}
      >
        <ThumbsUp className={`size-3.5 ${voted ? "fill-current" : ""}`} aria-hidden />
        {label}
      </button>
      {error && (
        <span role="status" className="text-xs text-muted-foreground">
          {error}
        </span>
      )}
    </span>
  );
}
