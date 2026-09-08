import { defineConfig } from "drizzle-kit";

// Points at Supabase Postgres (Vercel Marketplace integration). Migrations
// run against the non-pooled connection; the app itself uses the pooled one
// (see src/db/index.ts).
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.POSTGRES_URL_NON_POOLING!,
  },
});
