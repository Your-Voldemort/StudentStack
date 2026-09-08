import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

// Pooled (Supavisor transaction mode) connection for app runtime queries.
// Prepared statements aren't supported in transaction mode, hence `prepare: false`.
const client = postgres(process.env.POSTGRES_URL!, { prepare: false });

export const db = drizzle(client, { schema });
export { schema };
