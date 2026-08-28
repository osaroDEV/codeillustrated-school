import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { nanoid } from "nanoid";

// All handlers below gate on a single shared ADMIN_SECRET header rather than
// per-user auth, so anyone holding that secret has full invite-code control.
// GET — list all invite codes
export async function GET(req: NextRequest) {
  const adminSecret = process.env.ADMIN_SECRET;
  const authHeader = req.headers.get("x-admin-secret");
  if (authHeader !== adminSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("invite_codes")
    .select("*, profiles(full_name)")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST — generate a new invite code
export async function POST(req: NextRequest) {
  const adminSecret = process.env.ADMIN_SECRET;
  const authHeader = req.headers.get("x-admin-secret");
  if (authHeader !== adminSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { course_id, expires_days } = await req.json();
  if (!course_id) {
    return NextResponse.json({ error: "course_id is required" }, { status: 400 });
  }

  // Generate a readable code: CILEARN-XXXXXX
  const code = `CILEARN-${nanoid(6).toUpperCase()}`;

  // Omitting expires_days yields a null expires_at, i.e. a code that never expires —
  // callers relying on expiry checks elsewhere must treat null as "no expiry", not "expired".
  const expires_at = expires_days
    ? new Date(Date.now() + expires_days * 24 * 60 * 60 * 1000).toISOString()
    : null;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("invite_codes")
    .insert({ code, course_id, expires_at })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

// DELETE — revoke an invite code
export async function DELETE(req: NextRequest) {
  const adminSecret = process.env.ADMIN_SECRET;
  const authHeader = req.headers.get("x-admin-secret");
  if (authHeader !== adminSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const supabase = createAdminClient();
  const { error } = await supabase.from("invite_codes").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
