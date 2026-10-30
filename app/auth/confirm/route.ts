import { NextRequest, NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createServerSupabase } from "@/lib/supabase-server";
import { BASE_PATH } from "@/lib/seo";

const OTP_TYPES: EmailOtpType[] = ["email", "signup", "magiclink", "recovery", "invite", "email_change"];

// Target of the links in supabase/templates/. Verifying the token_hash also
// signs the learner in, so a verification link lands them straight on their
// dashboard and a password-reset link on the page that sets a new password.
export async function GET(req: NextRequest) {
  const tokenHash = req.nextUrl.searchParams.get("token_hash");
  const type = req.nextUrl.searchParams.get("type") as EmailOtpType | null;
  // Links built from Supabase's default {{ .ConfirmationURL }} template have
  // already been verified by Supabase before redirecting here, and arrive with
  // either a PKCE code or nothing readable (tokens in the URL #fragment).
  const code = req.nextUrl.searchParams.get("code");

  // Redirect with a relative Location. In production codeillustrated.com/academy
  // is proxied to the Vercel deployment, so req.url carries the deployment's
  // own *.vercel.app host; an absolute URL built from it would move the learner
  // off the domain their new session cookie was set on. Route handlers also
  // don't apply next.config basePath to redirects, so it's prefixed here.
  const redirectTo = (path: string) =>
    new NextResponse(null, { status: 307, headers: { Location: `${BASE_PATH}${path}` } });

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

  if (failed) return redirectTo("/auth/login?error=link_invalid");
  return redirectTo(type === "recovery" ? "/auth/reset-password" : "/dashboard");
}
