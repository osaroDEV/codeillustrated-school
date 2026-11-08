import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { rejectNonAdmin } from "@/lib/supabase-server";
import { contactMessagePatchSchema } from "@/lib/admin-schemas";
import { dbErrorResponse, parseBody } from "@/lib/cohorts";

type Params = { params: Promise<{ id: string }> };

// PATCH — mark a contact message handled, or back to new.
export async function PATCH(req: NextRequest, { params }: Params) {
  const denied = await rejectNonAdmin();
  if (denied) return denied;

  const { id } = await params;
  const body = await parseBody(req, contactMessagePatchSchema);
  if (body.response) return body.response;

  const { status } = body.data;
  const { data, error } = await createAdminClient()
    .from("contact_messages")
    .update({ status, handled_at: status === "handled" ? new Date().toISOString() : null })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) return dbErrorResponse(error);
  if (!data) return NextResponse.json({ error: "Message not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}

// DELETE — remove a message, for spam or when someone asks to be forgotten.
export async function DELETE(_req: NextRequest, { params }: Params) {
  const denied = await rejectNonAdmin();
  if (denied) return denied;

  const { id } = await params;
  const { error } = await createAdminClient().from("contact_messages").delete().eq("id", id);
  if (error) return dbErrorResponse(error);
  return NextResponse.json({ success: true });
}
