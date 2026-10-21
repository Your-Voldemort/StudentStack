import "server-only";
import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { parseEligibilityProfile, type EligibilityProfile } from "@/lib/eligibility";
import { isBranch } from "@/lib/personalization";

// Student profiles (issue #34). As with bookmarks, callers pass the user id
// from a verified Supabase session, never one supplied by the client.

export type Profile = typeof schema.profiles.$inferSelect;

export async function getProfile(userId: string): Promise<Profile | null> {
  const [row] = await db.select().from(schema.profiles).where(eq(schema.profiles.userId, userId)).limit(1);
  return row ?? null;
}

export async function saveProfile(
  userId: string,
  fields: { branch: string | null; year: number | null },
): Promise<void> {
  const now = new Date();
  await db
    .insert(schema.profiles)
    .values({ userId, ...fields, completedOnboarding: true, updatedAt: now })
    .onConflictDoUpdate({
      target: schema.profiles.userId,
      set: { ...fields, completedOnboarding: true, updatedAt: now },
    });
}

// Eligibility sync (issue #84). Field and year share the #34 branch/year
// columns so onboarding and the eligibility sheet stay in step.
export function profileToEligibility(profile: Profile | null): EligibilityProfile | null {
  if (!profile) return null;
  if (!profile.eligibility && !profile.branch && !profile.year) return null;
  return parseEligibilityProfile({
    ...(profile.eligibility ?? {}),
    field: profile.branch ?? profile.eligibility?.field ?? undefined,
    year: profile.year ?? undefined,
  });
}

export async function saveEligibility(userId: string, eligibility: EligibilityProfile): Promise<void> {
  const now = new Date();
  const fields = {
    branch: isBranch(eligibility.field) ? eligibility.field : null,
    year: eligibility.year ?? null,
    eligibility: {
      country: eligibility.country,
      state: eligibility.state,
      level: eligibility.level,
      field: eligibility.field,
      hasEduEmail: eligibility.hasEduEmail,
      hasGithubPack: eligibility.hasGithubPack,
      hasStudentId: eligibility.hasStudentId,
    },
    completedOnboarding: true,
    updatedAt: now,
  };
  await db
    .insert(schema.profiles)
    .values({ userId, ...fields })
    .onConflictDoUpdate({ target: schema.profiles.userId, set: fields });
}

// Per-user deadlines feed (issue #84). 32 random bytes, URL-safe.
function newCalendarToken(): string {
  return randomBytes(32).toString("base64url");
}

export async function getOrCreateCalendarToken(userId: string): Promise<string> {
  const existing = await getProfile(userId);
  if (existing?.calendarToken) return existing.calendarToken;
  return rotateCalendarToken(userId);
}

export async function rotateCalendarToken(userId: string): Promise<string> {
  const token = newCalendarToken();
  await db
    .insert(schema.profiles)
    .values({ userId, calendarToken: token })
    .onConflictDoUpdate({ target: schema.profiles.userId, set: { calendarToken: token, updatedAt: new Date() } });
  return token;
}

export async function getUserIdByCalendarToken(token: string): Promise<string | null> {
  const [row] = await db
    .select({ userId: schema.profiles.userId })
    .from(schema.profiles)
    .where(eq(schema.profiles.calendarToken, token))
    .limit(1);
  return row?.userId ?? null;
}

// Weekly digest preference (issue #38).
export async function setEmailDigest(userId: string, enabled: boolean): Promise<void> {
  await db
    .insert(schema.profiles)
    .values({ userId, emailDigest: enabled })
    .onConflictDoUpdate({ target: schema.profiles.userId, set: { emailDigest: enabled, updatedAt: new Date() } });
}

export async function getDigestOptOuts(): Promise<Set<string>> {
  const rows = await db
    .select({ userId: schema.profiles.userId })
    .from(schema.profiles)
    .where(eq(schema.profiles.emailDigest, false));
  return new Set(rows.map((r) => r.userId));
}
