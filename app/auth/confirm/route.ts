import { NextRequest, NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createServerSupabase } from "@/lib/supabase-server";
import { BASE_PATH } from "@/lib/seo";

const OTP_TYPES: EmailOtpType[] = ["email", "signup", "magiclink", "recovery", "invite", "email_change"];

// Target of the verification link in supabase/templates/confirmation.html.
// Verifying the token_hash also signs the learner in, so a successful click
// lands them straight on their dashboard.
export async function GET(req: NextRequest) {
  const tokenHash = req.nextUrl.searchParams.get("token_hash");
  const type = req.nextUrl.searchParams.get("type") as EmailOtpType | null;
  // Links built from Supabase's default {{ .ConfirmationURL }} template have
  // already been verified by Supabase before redirecting here, and arrive with
  // either a PKCE code or nothing readable (tokens in the URL #fragment).
  const code = req.nextUrl.searchParams.get("code");

  // Route handlers don't apply next.config basePath to redirect URLs (and
  // req.nextUrl.clone() doesn't carry it here), so prefix it explicitly.
  const redirectTo = (path: string) => NextResponse.redirect(new URL(`${BASE_PATH}${path}`, req.url));

  if (!tokenHash && !code) return redirectTo("/auth/login?notice=verified");

  const supabase = await createServerSupabase();
  let failed = true;

  if (tokenHash && type && OTP_TYPES.includes(type)) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    failed = !!error;
    if (error) console.error("verifyOtp error:", error.message);
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    failed = !!error;
    if (error) console.error("exchangeCodeForSession error:", error.message);
  }

  return redirectTo(failed ? "/auth/login?error=link_invalid" : "/dashboard");
}
