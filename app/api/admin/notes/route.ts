import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { rejectNonAdmin } from "@/lib/supabase-server";

// GET — fetch notes for a specific learner
export async function GET(req: NextRequest) {
  const denied = await rejectNonAdmin();
  if (denied) return denied;

  const userId = req.nextUrl.searchParams.get("user_id");
  if (!userId) return NextResponse.json({ error: "user_id is required" }, { status: 400 });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("learner_notes")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST — create a note for a learner
export async function POST(req: NextRequest) {
  const denied = await rejectNonAdmin();
  if (denied) return denied;

  const { user_id, title, body } = await req.json();
  if (!user_id || !body) return NextResponse.json({ error: "user_id and body are required" }, { status: 400 });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("learner_notes")
    .insert({ user_id, title: title || null, body })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

// PATCH — edit an existing note
export async function PATCH(req: NextRequest) {
  const denied = await rejectNonAdmin();
  if (denied) return denied;

  const { id, title, body } = await req.json();
  if (!id || !body) return NextResponse.json({ error: "id and body are required" }, { status: 400 });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("learner_notes")
    .update({ title: title || null, body, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// DELETE — remove a note
export async function DELETE(req: NextRequest) {
  const denied = await rejectNonAdmin();
  if (denied) return denied;

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const supabase = createAdminClient();
  const { error } = await supabase.from("learner_notes").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
