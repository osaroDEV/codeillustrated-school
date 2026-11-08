import { NextResponse } from "next/server";
import { parseBody } from "@/lib/cohorts";
import { CONTACT_EMAIL, CONTACT_SEND_FAILED, contactSchema } from "@/lib/contact";
import { getCourses } from "@/lib/courses";
import { sendEmail } from "@/lib/email";
import { BASE_PATH, SITE_URL } from "@/lib/seo";
import { createAdminClient } from "@/lib/supabase";

const ACK_INTERVAL_MS = 24 * 60 * 60 * 1000;

type Admin = ReturnType<typeof createAdminClient>;

/** Store the message. Returns its ID, or null if the database couldn't take it. */
async function save(
  admin: Admin | null,
  row: { name: string; email: string; phone: string; course: string; message: string }
): Promise<string | null> {
  if (!admin) return null;
  const { data, error } = await admin.from("contact_messages").insert(row).select("id").single();
  if (error || !data) {
    console.error("Contact message not saved:", error?.message);
    return null;
  }
  return data.id as string;
}

/**
 * Tell the visitor we got it. Anyone can type someone else's address into the
 * form, so this holds nothing they wrote and goes out at most once a day per
 * address. Without a saved message there's no history to check, so it's skipped.
 */
async function acknowledge(admin: Admin, savedId: string, email: string) {
  const { count, error } = await admin
    .from("contact_messages")
    .select("id", { count: "exact", head: true })
    .eq("email", email)
    .neq("id", savedId)
    .gte("created_at", new Date(Date.now() - ACK_INTERVAL_MS).toISOString());
  if (error || count !== 0) return;

  await sendEmail({
    to: email,
    subject: "We've received your message",
    paragraphs: [
      "Hello,",
      "Thank you for contacting Code Illustrated. We've received your message and will get back to you within 24 hours.",
      "If it's urgent, you can reach us on WhatsApp at +44 7405 786 279.",
      "The Code Illustrated team",
    ],
  });
}

// POST — a visitor's message from the contact forms: keep it for Admin ->
// Messages, email the school (replies go to the visitor), acknowledge it.
export async function POST(req: Request) {
  const body = await parseBody(req, contactSchema);
  if (body.response) return body.response;
  const { name, phone, course, message, website } = body.data;
  const email = body.data.email.toLowerCase();

  // Only bots fill the hidden field. Look successful so they don't adapt.
  if (website) return NextResponse.json({ success: true });

  const interest =
    course === "other"
      ? "General inquiry"
      : (await getCourses()).find((c) => c.id === course)?.title ?? course;

  let admin: Admin | null = null;
  try {
    admin = createAdminClient();
  } catch (err) {
    console.error("Contact form: no database client:", err);
  }
  const savedId = await save(admin, { name, email, phone, course: interest, message });

  const sent = await sendEmail({
    to: CONTACT_EMAIL,
    replyTo: { email, name },
    subject: `New enquiry from ${name}: ${interest}`,
    paragraphs: [
      `Name: ${name}`,
      `Email: ${email}`,
      `Phone: ${phone}`,
      `Course: ${interest}`,
      ...message.split(/\n+/),
      `All messages: ${SITE_URL}${BASE_PATH}/admin/messages`,
    ],
  });

  // Either copy reaching the school counts; only losing both is a failure.
  if (!savedId && !sent) return NextResponse.json({ error: CONTACT_SEND_FAILED }, { status: 502 });

  if (admin && savedId) {
    if (sent) await admin.from("contact_messages").update({ email_sent: true }).eq("id", savedId);
    await acknowledge(admin, savedId, email);
  }

  return NextResponse.json({ success: true });
}
