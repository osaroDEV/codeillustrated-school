import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const adminSecret = process.env.ADMIN_SECRET;
  if (req.headers.get("x-admin-secret") !== adminSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { email, password } = await req.json();
  const supabase = createAdminClient();

  // Check if user exists
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) return NextResponse.json({ step: "list", error: listError.message }, { status: 500 });

  const user = users.find((u) => u.email === email);
  if (!user) return NextResponse.json({ step: "lookup", error: "No user found with that email" });

  return NextResponse.json({
    found: true,
    id: user.id,
    email: user.email,
    email_confirmed_at: user.email_confirmed_at,
    created_at: user.created_at,
    last_sign_in_at: user.last_sign_in_at,
  });
}
