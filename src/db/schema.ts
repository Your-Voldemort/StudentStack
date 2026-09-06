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
} from "drizzle-orm/pg-core";

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  icon: text("icon").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

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
  costType: text("cost_type", {
    enum: ["free", "discount", "stipend", "scholarship", "credits", "trial"],
  }).notNull(),
  deadline: timestamp("deadline"),
  status: text("status", { enum: ["active", "expired", "broken"] })
    .notNull()
    .default("active"),
  lastVerifiedAt: timestamp("last_verified_at"),
  clickCount: integer("click_count").notNull().default(0),
  submittedBy: text("submitted_by"),
  approved: boolean("approved").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

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
);

export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  resourceId: integer("resource_id")
    .notNull()
    .references(() => resources.id),
  userId: uuid("user_id").notNull(),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const clickEvents = pgTable("click_events", {
  id: serial("id").primaryKey(),
  resourceId: integer("resource_id")
    .notNull()
    .references(() => resources.id),
  userId: uuid("user_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
