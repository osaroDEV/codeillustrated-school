import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

// POST — confirm all unconfirmed users or a specific user by email
export async function POST(req: NextRequest) {
  const adminSecret = process.env.ADMIN_SECRET;
  const authHeader = req.headers.get("x-admin-secret");
  if (authHeader !== adminSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { email } = await req.json();
  const supabase = createAdminClient();

  if (email) {
    // Confirm a specific user
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) return NextResponse.json({ error: listError.message }, { status: 500 });

    const user = users.find((u) => u.email === email);
    if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });

    const { error } = await supabase.auth.admin.updateUserById(user.id, {
      email_confirm: true,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ confirmed: [email] });
  }

  // No email provided — confirm ALL unconfirmed users
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) return NextResponse.json({ error: listError.message }, { status: 500 });

  const unconfirmed = users.filter((u) => !u.email_confirmed_at);
  const results: string[] = [];

  for (const u of unconfirmed) {
    const { error } = await supabase.auth.admin.updateUserById(u.id, { email_confirm: true });
    if (!error && u.email) results.push(u.email);
  }

  return NextResponse.json({ confirmed: results, total: results.length });
}
