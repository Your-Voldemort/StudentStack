// Canonical schema per PRD §7 (PostgreSQL / Supabase target).
// Not wired to a live connection yet — see src/db/schema.sqlite.ts and
// PROGRESS.md for the local-dev stand-in and the two documented deviations
// (costType gains 'trial', url/hasStaticClaimUrl handle offers with no
// static claim link).
import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  uuid,
  primaryKey,
  jsonb,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// Structured eligibility for opportunities (issue #78). Every field is
// optional: an unset field means the opportunity is open on that axis.
export type ResourceEligibility = {
  levels?: ("UG" | "PG" | "PhD" | "HighSchool")[];
  countries?: string[]; // ISO 3166-1 alpha-2, e.g. ["IN"]
  states?: string[];
  minYear?: number;
  maxAge?: number;
  gender?: string;
  incomeCapInr?: number;
  fields?: string[]; // e.g. ["CS", "ECE"]
};

export const RESOURCE_KIND_VALUES = [
  "perk",
  "scholarship",
  "fellowship",
  "internship",
  "mentorship",
  "program",
] as const;

// Row-level security is on for every table, with no policies. The app reads
// and writes as the table owner over a direct Postgres connection, so it is
// unaffected; the policies-free RLS keeps these tables unreachable through
// Supabase's Data API with the public (publishable) key.
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  icon: text("icon").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
}).enableRLS();

export const resources = pgTable("resources", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  tagline: text("tagline"),
  description: text("description").notNull(),
  url: text("url"),
  hasStaticClaimUrl: boolean("has_static_claim_url").notNull().default(true),
  categoryId: integer("category_id")
    .notNull()
    .references(() => categories.id),
  tags: text("tags").array().notNull().default([]),
  region: text("region", { enum: ["IN", "Global"] })
    .notNull()
    .default("Global"),
  // Opportunity kind (issue #78), orthogonal to category. Existing rows are
  // all software perks, so the default keeps them unchanged.
  kind: text("kind", { enum: RESOURCE_KIND_VALUES }).notNull().default("perk"),
  // Raw region availability preserved from offers.json location data
  // (issue #74). Previously everything non-India collapsed to "Global",
  // which swallowed US/UK/EU-only offers. `regions` holds normalized
  // region codes (e.g. ["IN"], ["US"], ["GB"], or [] when unrestricted);
  // `regionLocked` is true when the offer is restricted to specific
  // geographies. "Works in India" = IN ∈ regions || !regionLocked.
  regions: text("regions").array().notNull().default([]),
  regionLocked: boolean("region_locked").notNull().default(false),
  costType: text("cost_type", {
    enum: ["free", "discount", "stipend", "scholarship", "credits", "trial"],
  }).notNull(),
  verificationNeeded: text("verification_needed", {
    enum: ["none", "edu_email", "github_student_pack", "student_id"],
  }),
  creditCardRequired: boolean("credit_card_required"),
  duration: text("duration", {
    enum: ["one_time", "one_year", "while_student", "lifetime"],
  }),
  deadline: timestamp("deadline"),
  // Opportunity timeline and funding metadata (issue #78). All nullable:
  // perks leave them empty.
  opensAt: timestamp("opens_at"),
  recurrence: text("recurrence"), // e.g. "annual, opens Feb"
  amount: text("amount"), // e.g. "₹31,000/month", "$1,500–6,600"
  provider: text("provider"), // e.g. "Google", "AICTE"
  eligibility: jsonb("eligibility").$type<ResourceEligibility>(),
  status: text("status", { enum: ["active", "expired", "broken"] })
    .notNull()
    .default("active"),
  lastVerifiedAt: timestamp("last_verified_at"),
  // Consecutive failed weekly link-health checks (issue #76). A resource
  // flips to 'broken' on its first failure and to 'expired' once it reaches
  // 2 consecutive failures; a passing check resets it to 0 ('active').
  consecutiveFailures: integer("consecutive_failures").notNull().default(0),
  clickCount: integer("click_count").notNull().default(0),
  submittedBy: text("submitted_by"),
  // Optional public credit a student asked for when submitting (issue #82),
  // e.g. "Priya, IIT Madras". Shown on /r/[slug] once approved.
  contributorCredit: text("contributor_credit"),
  approved: boolean("approved").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}).enableRLS();

export const bookmarks = pgTable(
  "bookmarks",
  {
    userId: uuid("user_id").notNull(),
    resourceId: integer("resource_id")
      .notNull()
      .references(() => resources.id),
    status: text("status", {
      enum: ["interested", "applied", "got_it", "rejected"],
    })
      .notNull()
      .default("interested"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.resourceId] })],
).enableRLS();

// Per-student profile (issue #34), keyed by the Supabase auth user id.
// Branch and year are optional and only ever boost ranking ("For you"
// sort), never filter anything out.
export const profiles = pgTable("profiles", {
  userId: uuid("user_id").primaryKey(),
  branch: text("branch"),
  year: integer("year"),
  completedOnboarding: boolean("completed_onboarding").notNull().default(false),
  // Admin access (issue #42): "admin" can use /admin in addition to the
  // ADMIN_EMAIL allow-list. Granted with scripts/grant-admin.ts.
  role: text("role", { enum: ["student", "admin"] }).notNull().default("student"),
  // Synced copy of the accountless eligibility profile (issue #84): country,
  // state, degree level, and verification methods. Branch and year live in
  // the columns above.
  eligibility: jsonb("eligibility").$type<{
    country?: string;
    state?: string;
    level?: string;
    field?: string;
    hasEduEmail?: boolean;
    hasGithubPack?: boolean;
    hasStudentId?: boolean;
  }>(),
  // Secret for the per-user /u/[token]/deadlines.ics feed (issue #84).
  // Calendar apps can't send cookies, so the URL itself is the credential.
  calendarToken: text("calendar_token").unique(),
  // Weekly digest email (issue #38). On by default; one-click unsubscribe
  // in every email turns it off.
  emailDigest: boolean("email_digest").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}).enableRLS();

// Reviews (issue #37): one per student per resource, enforced by the
// unique index. `verifiedStudent` records whether the author signed in with
// an academic email when they wrote it, for the "Verified student" badge.
export const reviews = pgTable(
  "reviews",
  {
    id: serial("id").primaryKey(),
    resourceId: integer("resource_id")
      .notNull()
      .references(() => resources.id),
    userId: uuid("user_id").notNull(),
    rating: integer("rating").notNull(),
    comment: text("comment"),
    verifiedStudent: boolean("verified_student").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("reviews_resource_user_unique").on(t.resourceId, t.userId)],
).enableRLS();

export const clickEvents = pgTable("click_events", {
  id: serial("id").primaryKey(),
  resourceId: integer("resource_id")
    .notNull()
    .references(() => resources.id),
  userId: uuid("user_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}).enableRLS();

export const ingestionCandidates = pgTable("ingestion_candidates", {
  id: serial("id").primaryKey(),
  sourceName: text("source_name").notNull(),
  externalId: text("external_id"),
  name: text("name").notNull(),
  tagline: text("tagline"),
  description: text("description").notNull(),
  url: text("url"),
  categorySlug: text("category_slug"),
  tags: text("tags").array().notNull().default([]),
  region: text("region", { enum: ["IN", "Global"] }),
  costType: text("cost_type", {
    enum: ["free", "discount", "stipend", "scholarship", "credits", "trial"],
  }),
  kind: text("kind", { enum: RESOURCE_KIND_VALUES }),
  deadline: timestamp("deadline"),
  opensAt: timestamp("opens_at"),
  amount: text("amount"),
  provider: text("provider"),
  matchType: text("match_type", { enum: ["new", "possible_duplicate"] }).notNull(),
  matchedResourceId: integer("matched_resource_id").references(() => resources.id),
  status: text("status", { enum: ["pending", "approved", "rejected"] })
    .notNull()
    .default("pending"),
  rawPayload: text("raw_payload"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
  // RLS was missing here, which left the table readable and writable
  // through Supabase's Data API with the public key (issue #42).
}).enableRLS();

// Per-source state for the ingestion cron (issues #83, #40): the last
// upstream fingerprint (for change detection) and the last run's outcome
// (for source health on /admin/ingestion).
export const ingestionSources = pgTable("ingestion_sources", {
  name: text("name").primaryKey(),
  lastVersion: text("last_version"),
  lastRunAt: timestamp("last_run_at"),
  lastStatus: text("last_status", { enum: ["ok", "unchanged", "error"] }),
  lastError: text("last_error"),
  lastFetched: integer("last_fetched").notNull().default(0),
  lastQueued: integer("last_queued").notNull().default(0),
  lastSuccessAt: timestamp("last_success_at"),
}).enableRLS();
