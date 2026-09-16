import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { safeNextPath } from "@/lib/auth-redirect";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// Students land here after signing in:
// - ?code=        Google sign-in, or an email link opened in the same browser
//                 that requested it (PKCE: the verifier lives in a cookie).
// - ?token_hash=  an email link sent by a Supabase template that includes the
//                 token hash, which works on any device.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const origin = siteOrigin(request);
  const next = safeNextPath(searchParams.get("next"));
  const supabase = await createServerSupabaseClient();

  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  let failed = true;
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    failed = Boolean(error);
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    failed = Boolean(error);
  }

  if (failed) return NextResponse.redirect(`${origin}/submit?error=link`);
  return NextResponse.redirect(`${origin}${next}`);
}

// Behind Vercel's proxy the request URL can carry an internal host; the
// original one arrives in x-forwarded-host.
function siteOrigin(request: NextRequest): string {
  const forwardedHost = request.headers.get("x-forwarded-host");
  if (process.env.NODE_ENV !== "development" && forwardedHost) return `https://${forwardedHost}`;
  return request.nextUrl.origin;
}
