import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase";
import { getRole, requireVerifiedUserApi } from "@/lib/supabase-server";
import { dbErrorResponse, parseBody } from "@/lib/cohorts";
import { CONTACT_EMAIL } from "@/lib/contact";
import { appUrl } from "@/lib/billing-server";
import { enqueueEmails } from "@/lib/notifications";

type Params = { params: Promise<{ id: string }> };

const schema = z.object({ body: z.string().trim().min(1, "Write a reply first.").max(5000) });

// POST — reply on a learner note, as the learner it's for or as an admin.
// The other side gets an email.
export async function POST(req: NextRequest, { params }: Params) {
  const auth = await requireVerifiedUserApi();
  if (auth.response) return auth.response;
  const body = await parseBody(req, schema);
  if (body.response) return body.response;

  const { id } = await params;
  const admin = createAdminClient();
  const { data: note } = await admin
    .from("learner_notes")
    .select("id, user_id, title, profiles(email, full_name, email_notifications)")
    .eq("id", id)
    .maybeSingle();
  if (!note) return NextResponse.json({ error: "Note not found" }, { status: 404 });

  const isOwner = note.user_id === auth.user.id;
  if (!isOwner && (await getRole(auth.user.id)) !== "admin") {
    return NextResponse.json({ error: "Note not found" }, { status: 404 });
  }

  const { data: reply, error } = await admin
    .from("learner_note_replies")
    .insert({ note_id: note.id, author_id: auth.user.id, body: body.data.body })
    .select("id")
    .single();
  if (error) return dbErrorResponse(error);

  const learner = note.profiles as unknown as { email: string | null; full_name: string | null; email_notifications: boolean } | null;
  const about = note.title ? `"${note.title}"` : "a note";
  if (isOwner) {
    await enqueueEmails(admin, [
      {
        dedupe_key: `note-reply:${reply.id}`,
        to_email: CONTACT_EMAIL,
        subject: `${learner?.full_name || "A learner"} replied to ${about}`,
        paragraphs: [...body.data.body.split(/\n+/), `Reply from Admin → Learners: ${appUrl()}/admin/learners`],
      },
    ]);
  } else if (learner?.email && learner.email_notifications !== false) {
    await enqueueEmails(admin, [
      {
        dedupe_key: `note-reply:${reply.id}`,
        to_email: learner.email,
        to_name: learner.full_name,
        subject: `New reply on ${about}`,
        paragraphs: [`Your instructor replied on ${about}. Read it and respond from your dashboard: ${appUrl()}/dashboard`, "Code Illustrated"],
      },
    ]);
  }
  return NextResponse.json({ id: reply.id }, { status: 201 });
}
