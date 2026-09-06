// Local-dev stand-in for schema.ts, targeting SQLite (no Docker/Supabase
// project needed yet). Mirrors the Postgres schema's shape; see PROGRESS.md
// for the type mapping (array -> JSON text, enum -> text union, uuid -> text,
// boolean -> integer mode, timestamp -> integer mode). Swap db/index.ts back
// to schema.ts once a real Postgres DATABASE_URL exists.
import {
  sqliteTable,
  integer,
  text,
} from "drizzle-orm/sqlite-core";

export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  icon: text("icon").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const resources = sqliteTable("resources", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  tagline: text("tagline"),
  description: text("description").notNull(),
  url: text("url"),
  hasStaticClaimUrl: integer("has_static_claim_url", { mode: "boolean" })
    .notNull()
    .default(true),
  categoryId: integer("category_id")
    .notNull()
    .references(() => categories.id),
  tags: text("tags", { mode: "json" }).notNull().$type<string[]>(),
  region: text("region", { enum: ["IN", "Global"] })
    .notNull()
    .default("Global"),
  costType: text("cost_type", {
    enum: ["free", "discount", "stipend", "scholarship", "credits", "trial"],
  }).notNull(),
  deadline: integer("deadline", { mode: "timestamp" }),
  status: text("status", { enum: ["active", "expired", "broken"] })
    .notNull()
    .default("active"),
  lastVerifiedAt: integer("last_verified_at", { mode: "timestamp" }),
  clickCount: integer("click_count").notNull().default(0),
  submittedBy: text("submitted_by"),
  approved: integer("approved", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const bookmarks = sqliteTable("bookmarks", {
  userId: text("user_id").notNull(),
  resourceId: integer("resource_id")
    .notNull()
    .references(() => resources.id),
  status: text("status", {
    enum: ["interested", "applied", "got_it", "rejected"],
  })
    .notNull()
    .default("interested"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const reviews = sqliteTable("reviews", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  resourceId: integer("resource_id")
    .notNull()
    .references(() => resources.id),
  userId: text("user_id").notNull(),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const clickEvents = sqliteTable("click_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  resourceId: integer("resource_id")
    .notNull()
    .references(() => resources.id),
  userId: text("user_id"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});
