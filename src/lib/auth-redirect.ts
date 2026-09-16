// Where to send someone after sign-in. Only same-site paths are allowed, so a
// crafted link like /auth/callback?next=//evil.example can't bounce a student
// who just signed in to another site. Parsing with URL (rather than checking
// prefixes) also catches tricks browsers normalize, like "/\evil.example".
export function safeNextPath(next: string | null | undefined, fallback = "/submit"): string {
  if (!next || !next.startsWith("/")) return fallback;
  try {
    const base = "http://localhost";
    const url = new URL(next, base);
    if (url.origin !== base) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

if (process.argv[1] && process.argv[1].endsWith("auth-redirect.ts")) {
  const cases: [string | null, string][] = [
    [null, "/submit"],
    ["", "/submit"],
    ["/submit?sent=1", "/submit?sent=1"],
    ["/admin", "/admin"],
    ["https://evil.example", "/submit"],
    ["//evil.example", "/submit"],
    ["/\\evil.example", "/submit"],
    ["/\t/evil.example", "/submit"],
    ["submit", "/submit"],
  ];
  let failures = 0;
  for (const [input, expected] of cases) {
    const actual = safeNextPath(input);
    if (actual !== expected) {
      failures++;
      console.error(`FAIL: safeNextPath(${JSON.stringify(input)}) = ${actual}, expected ${expected}`);
    }
  }
  if (failures === 0) console.log("OK: auth-redirect.ts self-check passed");
  else process.exitCode = 1;
}
