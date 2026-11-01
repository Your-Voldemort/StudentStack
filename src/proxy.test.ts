import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import proxy from "./proxy";

vi.mock("@supabase/ssr", () => ({ createServerClient: vi.fn() }));

const mockCreateClient = vi.mocked(createServerClient);

function run(path: string) {
  return proxy(new NextRequest(`http://localhost${path}`));
}

function signedInAs(user: { id: string } | null) {
  mockCreateClient.mockReturnValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
  } as unknown as ReturnType<typeof createServerClient>);
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("proxy without Supabase configured", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
  });

  it("redirects admin routes to the login page", async () => {
    for (const path of ["/admin", "/admin/ingestion", "/admin/resources/new"]) {
      const res = await run(path);
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toBe("http://localhost/admin/login");
    }
    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it("lets the login page and other matched routes through", async () => {
    for (const path of ["/admin/login", "/submit", "/my-list"]) {
      const res = await run(path);
      expect(res.headers.get("location")).toBeNull();
    }
    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it("treats a URL without a key as unconfigured", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    const res = await run("/admin");
    expect(res.headers.get("location")).toBe("http://localhost/admin/login");
    expect(mockCreateClient).not.toHaveBeenCalled();
  });
});

describe("proxy with Supabase configured", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "publishable-key");
  });

  it("redirects signed-out visitors away from admin routes", async () => {
    signedInAs(null);
    const res = await run("/admin");
    expect(res.headers.get("location")).toBe("http://localhost/admin/login");
  });

  it("lets signed-in users through", async () => {
    signedInAs({ id: "user-1" });
    const res = await run("/admin");
    expect(res.headers.get("location")).toBeNull();
  });

  it("skips the Supabase Auth round-trip on /admin/login", async () => {
    const res = await run("/admin/login");
    expect(res.headers.get("location")).toBeNull();
    expect(mockCreateClient).not.toHaveBeenCalled();
  });
});
