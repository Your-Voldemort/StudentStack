export type CheckOutcome = { ok: boolean };

// A resource is "broken" on a non-2xx/3xx status or a network error/timeout.
// Kept pure and separate from the fetch call so it's testable without a
// network round trip (see the self-check below).
export function classifyCheck(outcome: CheckOutcome): "active" | "broken" {
  return outcome.ok ? "active" : "broken";
}

export async function checkUrl(url: string, timeoutMs = 8000): Promise<CheckOutcome> {
  const attempt = (method: "HEAD" | "GET") =>
    fetch(url, {
      method,
      redirect: "follow",
      signal: AbortSignal.timeout(timeoutMs),
    });

  try {
    let res = await attempt("HEAD");
    if (res.status === 405 || res.status === 501) {
      res = await attempt("GET");
    }
    return { ok: res.ok };
  } catch {
    try {
      const res = await attempt("GET");
      return { ok: res.ok };
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

  const seen: number[] = [];
  runWithConcurrency([1, 2, 3, 4, 5], 2, async (n) => {
    seen.push(n);
  }).then(() => {
    console.assert(seen.length === 5, `expected all 5 items processed, got ${seen.length}`);
    console.log("OK: link-health pure logic self-check passed");
  });
}
