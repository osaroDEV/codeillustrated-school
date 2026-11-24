// Cloudflare Turnstile, the CAPTCHA on the account pages.
//
// The browser widget (components/auth/captcha.tsx) gives each visitor a
// single-use token. Log in, password reset and resend-verification pass it
// straight to Supabase, which checks it once CAPTCHA protection is switched on
// in the Supabase dashboard. Signup runs through /api/auth/complete-signup on
// the server, where Supabase would see Vercel's IP instead of the visitor's,
// so that route checks the token here and then signs up with the service-role
// key (which Supabase lets past its own check).
//
// Until TURNSTILE_SECRET_KEY / NEXT_PUBLIC_TURNSTILE_SITE_KEY are set, the
// check is skipped and the forms work as before.

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export function captchaRequired(): boolean {
  return !!process.env.TURNSTILE_SECRET_KEY;
}

/** True when the token is valid, or when no secret is configured yet. Fails closed on network errors. */
export async function verifyTurnstile(token: string | undefined, remoteIp?: string | null): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (!token) return false;

  const body = new URLSearchParams({ secret, response: token });
  if (remoteIp) body.set("remoteip", remoteIp);
  try {
    const res = await fetch(SITEVERIFY_URL, { method: "POST", body });
    const data = (await res.json().catch(() => ({}))) as { success?: boolean };
    return data.success === true;
  } catch (err) {
    console.error("Turnstile verification failed:", err);
    return false;
  }
}
