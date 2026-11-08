import { NextResponse } from "next/server";
import { parseBody } from "@/lib/cohorts";
import { CONTACT_EMAIL, CONTACT_SEND_FAILED, contactSchema } from "@/lib/contact";
import { getCourses } from "@/lib/courses";
import { sendEmail } from "@/lib/email";

// POST — email a visitor's message from the contact forms to the school.
// Replies go straight to the visitor.
export async function POST(req: Request) {
  const body = await parseBody(req, contactSchema);
  if (body.response) return body.response;
  const { name, email, phone, course, message, website } = body.data;

  // Only bots fill the hidden field. Look successful so they don't adapt.
  if (website) return NextResponse.json({ success: true });

  const interest =
    course === "other"
      ? "General inquiry"
      : (await getCourses()).find((c) => c.id === course)?.title ?? course;

  const sent = await sendEmail({
    to: CONTACT_EMAIL,
    replyTo: { email, name },
    subject: `New enquiry from ${name}: ${interest}`,
    paragraphs: [`Name: ${name}`, `Email: ${email}`, `Phone: ${phone}`, `Course: ${interest}`, ...message.split(/\n+/)],
  });
  if (!sent) return NextResponse.json({ error: CONTACT_SEND_FAILED }, { status: 502 });

  return NextResponse.json({ success: true });
}
