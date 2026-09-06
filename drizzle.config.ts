import { defineConfig } from "drizzle-kit";

// Local dev only — points at SQLite. Once a real Supabase/Neon project
// exists, switch dialect to "postgresql", schema to "./src/db/schema.ts",
// and dbCredentials to { url: process.env.DATABASE_URL }.
export default defineConfig({
  dialect: "sqlite",
  schema: "./src/db/schema.sqlite.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.SQLITE_PATH ?? "local.db",
  },
});
