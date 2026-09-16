import "server-only";
import { createClient } from "@supabase/supabase-js";

// Service-role client for admin-only lookups (who sent a submission). The key
// bypasses every Supabase access rule, so this must never reach a Client
// Component; "server-only" makes that a build error.
export function createAdminSupabaseClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
