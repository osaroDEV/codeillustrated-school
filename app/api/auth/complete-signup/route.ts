import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase";
import { screenSignup } from "@/lib/signup-guard";
import { verifyTurnstile } from "@/lib/turnstile";
import { findUsableInvite, redeemInvite } from "@/lib/invites";
import { safeRedirectPath } from "@/lib/utils";

const bodySchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8),
  fullName: z.string().trim().max(120).optional(),
  // Optional scholarship / comp code; signup itself is open.
  inviteCode: z.string().trim().max(40).optional(),
  // Where the verification link should land them, e.g. the course they were
  // enrolling in. Only paths on this site are kept.
  redirectTo: z.string().max(300).optional(),
  // Bot checks (lib/signup-guard.ts, lib/turnstile.ts).
  captchaToken: z.string().max(4096).optional(),
  formMs: z.number().optional(),
  honeypot: z.string().max(500).optional(),
});

/** The visitor's IP as Vercel reports it, for the CAPTCHA check. */
function clientIp(req: NextRequest): string | null {
  return req.headers.get("x-real-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
}

export async function POST(req: NextRequest) {
  try {
    const parsed = bodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Please provide a valid email and a password of at least 8 characters." }, { status: 400 });
    }
    const { email, password, fullName, inviteCode, captchaToken, formMs, honeypot } = parsed.data;
    const nextPath = safeRedirectPath(parsed.data.redirectTo, "") || null;

    // Bots first, before anything that reveals whether an address has an account.
    const screen = screenSignup({ formMs, honeypot });
    if (screen === "honeypot") {
      // Look like it worked, so the bot has nothing to learn from.
      return NextResponse.json({ success: true, enrolled: false, email }, { status: 201 });
    }
    if (screen === "too_fast") {
      return NextResponse.json(
        { error: "That was quick! Please check your details, then press Create my account again." },
        { status: 400 }
      );
    }
    if (!(await verifyTurnstile(captchaToken, clientIp(req)))) {
      return NextResponse.json(
        { error: "Please complete the security check, then try again.", code: "captcha_failed" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Checked up front so the rollback below only ever deletes an account this
    // request created (signUp on an existing address returns that account).
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists. Sign in instead." },
        { status: 409 }
      );
    }

    // Reject a bad code before creating the account, so the learner can fix it.
    if (inviteCode) {
      const found = await findUsableInvite(supabase, inviteCode);
      if (!found.ok) return NextResponse.json({ error: found.error }, { status: found.status });
    }

    // 1. Create the auth user through the regular signup endpoint so Supabase
    // emails the verification link; the account can't sign in until it's
    // clicked. It's called with the service-role key, which Supabase lets past
    // its own CAPTCHA check: the token was checked above, with the visitor's IP.
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // next_path is read back by /auth/confirm: the email templates link
        // there directly, so emailRedirectTo can't carry it.
        data: { full_name: fullName || null, ...(nextPath ? { next_path: nextPath } : {}) },
        emailRedirectTo: `${req.nextUrl.origin}/auth/confirm`,
      },
    });

    // An empty identities array means the address is already registered
    // (Supabase hides this instead of erroring, to resist email enumeration).
    if (authData.user && authData.user.identities?.length === 0) {
      return NextResponse.json(
        { error: "An account with this email already exists. Sign in instead." },
        { status: 409 }
      );
    }

    // Supabase caps verification emails per hour (auth.rate_limit.email_sent).
    if (authError?.status === 429) {
      return NextResponse.json(
        { error: "We're sending a lot of sign-up emails right now. Please try again in a few minutes." },
        { status: 429 }
      );
    }

    if (authError || !authData.user) {
      console.error("Auth user creation error:", authError);
      return NextResponse.json({ error: authError?.message || "Failed to create account." }, { status: 500 });
    }

    const userId = authData.user.id;

    // 2. Create profile (the on_auth_user_created trigger usually has already;
    // the upsert covers databases where that migration hasn't run yet)
    const { error: profileError } = await supabase.from("profiles").upsert({
      id: userId,
      full_name: fullName || null,
      email,
    });

    if (profileError) {
      console.error("Profile creation error:", profileError);
      await supabase.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: "Failed to create profile." }, { status: 500 });
    }

    // 3. Redeem the invite code, if one was given
    if (inviteCode) {
      const result = await redeemInvite(supabase, inviteCode, userId);
      if (!result.ok) {
        await supabase.auth.admin.deleteUser(userId);
        return NextResponse.json({ error: result.error }, { status: result.status });
      }
    }

    return NextResponse.json({ success: true, enrolled: !!inviteCode, email }, { status: 201 });
  } catch (err) {
    console.error("complete-signup error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
