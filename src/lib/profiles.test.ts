import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeDb } from "@/test/fake-db";
import {
  getDigestOptOuts,
  getOrCreateCalendarToken,
  getProfile,
  getUserIdByCalendarToken,
  profileToEligibility,
  rotateCalendarToken,
  saveEligibility,
  saveProfile,
  setEmailDigest,
  type Profile,
} from "./profiles";

vi.mock("@/db", async () => {
  const { fakeDb } = await import("@/test/fake-db");
  return { db: fakeDb.db, schema: await import("@/db/schema") };
});

function profile(over: Partial<Profile> = {}): Profile {
  return {
    userId: "user-1",
    branch: null,
    year: null,
    eligibility: null,
    completedOnboarding: false,
    role: "student",
    calendarToken: null,
    emailDigest: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...over,
  } as Profile;
}

type Upsert = { set: Record<string, unknown> };

beforeEach(() => fakeDb.reset());

describe("getProfile", () => {
  it("returns the row or null", async () => {
    const row = profile({ branch: "CSE" });
    fakeDb.queue([row], []);
    expect(await getProfile("user-1")).toBe(row);
    expect(await getProfile("user-2")).toBeNull();
  });
});

describe("saveProfile", () => {
  it("marks onboarding complete on insert and on conflict", async () => {
    await saveProfile("user-1", { branch: "CSE", year: 2 });
    const values = fakeDb.call(0, "values")?.args[0];
    expect(values).toMatchObject({ userId: "user-1", branch: "CSE", year: 2, completedOnboarding: true });
    const { set } = fakeDb.call(0, "onConflictDoUpdate")?.args[0] as Upsert;
    expect(set).toMatchObject({ branch: "CSE", year: 2, completedOnboarding: true });
    expect(set).not.toHaveProperty("userId");
  });
});

describe("profileToEligibility", () => {
  it("is null for a missing or empty profile", () => {
    expect(profileToEligibility(null)).toBeNull();
    expect(profileToEligibility(profile())).toBeNull();
  });

  it("merges branch and year into the stored eligibility", () => {
    const result = profileToEligibility(
      profile({ branch: "CSE", year: 3, eligibility: { country: "US", level: "UG", hasEduEmail: true } }),
    );
    expect(result).toEqual({ country: "US", level: "UG", field: "CSE", year: 3, hasEduEmail: true });
  });

  it("preserves a non-branch custom field stored in eligibility when branch is null", () => {
    const result = profileToEligibility(
      profile({
        branch: null,
        year: 4,
        eligibility: { country: "IN", field: "Biotech" } as Profile["eligibility"],
      }),
    );
    expect(result).toEqual({ country: "IN", field: "Biotech", year: 4 });
  });

  it("defaults to India when only branch/year are known", () => {
    expect(profileToEligibility(profile({ year: 1 }))).toEqual({ country: "IN", year: 1 });
  });
});

describe("saveEligibility", () => {
  it("stores a known branch and the eligibility axes", async () => {
    await saveEligibility("user-1", { country: "IN", field: "CSE", year: 2, level: "UG", hasGithubPack: true });
    const { set } = fakeDb.call(0, "onConflictDoUpdate")?.args[0] as Upsert;
    expect(set).toMatchObject({
      branch: "CSE",
      year: 2,
      completedOnboarding: true,
      eligibility: { country: "IN", level: "UG", hasGithubPack: true },
    });
  });

  it("drops a free-text field that isn't a known branch", async () => {
    await saveEligibility("user-1", { country: "IN", field: "Underwater basket weaving" });
    const { set } = fakeDb.call(0, "onConflictDoUpdate")?.args[0] as Upsert;
    expect(set).toMatchObject({ branch: null, year: null });
  });
});

describe("calendar tokens", () => {
  it("reuses an existing token", async () => {
    fakeDb.queue([profile({ calendarToken: "existing" })]);
    expect(await getOrCreateCalendarToken("user-1")).toBe("existing");
    expect(fakeDb.queries).toHaveLength(1);
  });

  it("creates a URL-safe token when there is none", async () => {
    fakeDb.queue([]);
    const token = await getOrCreateCalendarToken("user-1");
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(fakeDb.call(1, "values")?.args[0]).toEqual({ userId: "user-1", calendarToken: token });
  });

  it("issues a different token on every rotation", async () => {
    const a = await rotateCalendarToken("user-1");
    const b = await rotateCalendarToken("user-1");
    expect(a).not.toBe(b);
    const { set } = fakeDb.call(1, "onConflictDoUpdate")?.args[0] as Upsert;
    expect(set.calendarToken).toBe(b);
  });

  it("resolves a token to its user, or null", async () => {
    fakeDb.queue([{ userId: "user-1" }], []);
    expect(await getUserIdByCalendarToken("tok")).toBe("user-1");
    expect(await getUserIdByCalendarToken("unknown")).toBeNull();
  });
});

describe("weekly digest preference", () => {
  it("upserts the flag", async () => {
    await setEmailDigest("user-1", false);
    expect(fakeDb.call(0, "values")?.args[0]).toEqual({ userId: "user-1", emailDigest: false });
    const { set } = fakeDb.call(0, "onConflictDoUpdate")?.args[0] as Upsert;
    expect(set.emailDigest).toBe(false);
  });

  it("collects opted-out user ids", async () => {
    fakeDb.queue([{ userId: "a" }, { userId: "b" }]);
    expect(await getDigestOptOuts()).toEqual(new Set(["a", "b"]));
  });
});
