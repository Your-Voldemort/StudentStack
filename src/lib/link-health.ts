import { assertPublicUrl, isRedirectStatus } from "./ssrf";

// Cap the redirect chain: endless or attacker-controlled redirect loops must
// not turn the weekly cron into an unbounded fetch loop.
const MAX_REDIRECTS = 5;

export type CheckOutcome = { ok: boolean };

// A resource is "broken" on a non-2xx/3xx status or a network error/timeout.
// Kept pure and separate from the fetch call so it's testable without a
// network round trip (see the self-check below).
export function classifyCheck(outcome: CheckOutcome): "active" | "broken" {
  return outcome.ok ? "active" : "broken";
}

export type LinkHealthStatus = "active" | "broken" | "expired";

export type StatusTransition = {
  status: LinkHealthStatus;
  consecutiveFailures: number;
};

// Pure transition for the weekly cron (issue #76): a passing check heals the
// resource back to 'active'; a failed check increments the consecutive
// failure counter, flipping to 'broken' on the first failure and to
// 'expired' once 2 consecutive failures are reached.
export function resolveStatusTransition(args: {
  previousStatus: LinkHealthStatus;
  consecutiveFailures: number;
  outcome: CheckOutcome;
}): StatusTransition {
  if (args.outcome.ok) {
    return { status: "active", consecutiveFailures: 0 };
  }
  const consecutiveFailures = (args.consecutiveFailures ?? 0) + 1;
  return {
    status: consecutiveFailures >= 2 ? "expired" : "broken",
    consecutiveFailures,
  };
}

export async function checkUrl(url: string, timeoutMs = 8000): Promise<CheckOutcome> {
  // SSRF: refuse to fetch anything that doesn't resolve to a public IP.
  try {
    await assertPublicUrl(url);
  } catch {
    return { ok: false };
  }

  const attempt = (method: "HEAD" | "GET", target: string) =>
    fetch(target, {
      method,
      // Redirects are followed manually (capped) below so every hop is
      // re-validated against the SSRF guard — fetch's built-in "follow"
      // cannot do that, and would happily chase a redirect to 169.254.169.254.
      redirect: "manual",
      signal: AbortSignal.timeout(timeoutMs),
    });

  const fetchChecked = async (method: "HEAD" | "GET", target: string): Promise<Response | null> => {
    let current = target;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const res = await attempt(method, current);
      if (!isRedirectStatus(res.status)) return res;
      const location = res.headers.get("location");
      if (!location) return res;
      let next: URL;
      try {
        next = new URL(location, current);
      } catch {
        return res;
      }
      try {
        await assertPublicUrl(next.toString());
      } catch {
        return null; // redirect target is not a public URL — treat as broken
      }
      current = next.toString();
      if (res.status === 303) method = "GET";
    }
    return null; // redirect loop / chain too long — treat as broken
  };

  try {
    let res = await fetchChecked("HEAD", url);
    if (res && (res.status === 405 || res.status === 501)) {
      res = await fetchChecked("GET", url);
    }
    return { ok: res !== null && res.ok };
  } catch {
    try {
      const res = await fetchChecked("GET", url);
      return { ok: res !== null && res.ok };
    } catch {
      return { ok: false };
    }
  }
}

// Minimal fixed-size worker pool — no new dependency for what a loop of
// `limit` self-refilling workers does in ~10 lines.
export async function runWithConcurrency<T>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  let index = 0;
  async function runNext(): Promise<void> {
    const current = index++;
    if (current >= items.length) return;
    await worker(items[current]);
    return runNext();
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, runNext));
}

if (process.argv[1] && process.argv[1].endsWith("link-health.ts")) {
  console.assert(classifyCheck({ ok: true }) === "active", "ok result should classify as active");
  console.assert(classifyCheck({ ok: false }) === "broken", "failed result should classify as broken");

  // Issue #76: first failure → broken, second consecutive → expired,
  // success → active with a reset counter.
  const first = resolveStatusTransition({ previousStatus: "active", consecutiveFailures: 0, outcome: { ok: false } });
  console.assert(first.status === "broken" && first.consecutiveFailures === 1, "first failure should mark broken");
  const second = resolveStatusTransition({ previousStatus: "broken", consecutiveFailures: 1, outcome: { ok: false } });
  console.assert(second.status === "expired" && second.consecutiveFailures === 2, "second consecutive failure should expire");
  const healed = resolveStatusTransition({ previousStatus: "broken", consecutiveFailures: 1, outcome: { ok: true } });
  console.assert(healed.status === "active" && healed.consecutiveFailures === 0, "success should reset to active");

  const seen: number[] = [];
  runWithConcurrency([1, 2, 3, 4, 5], 2, async (n) => {
    seen.push(n);
  }).then(() => {
    console.assert(seen.length === 5, `expected all 5 items processed, got ${seen.length}`);
    console.log("OK: link-health pure logic self-check passed");
  });
}
