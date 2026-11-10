import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase";
import { listAllAuthUsers } from "@/lib/auth-admin";
import { rejectNonAdmin } from "@/lib/supabase-server";

const bodySchema = z.object({ email: z.string().trim().toLowerCase().email().optional() });

// POST — email a fresh verification link to one learner ({ email }) or to
// every account that hasn't verified yet ({}). Already-verified accounts are
// skipped; Supabase's per-address and hourly email rate limits still apply,
// so large batches may report some failures to retry later.
export async function POST(req: NextRequest) {
  const denied = await rejectNonAdmin();
  if (denied) return denied;

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid email." }, { status: 400 });
  const { email } = parsed.data;

  let users;
  try {
    users = await listAllAuthUsers(createAdminClient());
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }

  const targets = users.filter(
    (u) => u.email && !u.email_confirmed_at && (!email || u.email.toLowerCase() === email)
  );
  if (email && targets.length === 0) {
    return NextResponse.json({ error: "No unverified account with that email." }, { status: 404 });
  }

  // resend() is a public (anon) auth endpoint, not part of the admin API.
  const anon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  const sent: string[] = [];
  const failed: { email: string; error: string }[] = [];

  for (const u of targets) {
    const { error } = await anon.auth.resend({
      type: "signup",
      email: u.email!,
      options: { emailRedirectTo: `${req.nextUrl.origin}/auth/confirm` },
    });
    if (error) failed.push({ email: u.email!, error: error.message });
    else sent.push(u.email!);
  }

  return NextResponse.json({ sent, failed });
}
