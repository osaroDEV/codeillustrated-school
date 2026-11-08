import { z } from "zod";

// The Contact Us form and the popup share this schema, on the browser and in
// /api/contact. `website` is a honeypot: hidden from people, filled by bots.

export const CONTACT_EMAIL = "admin@codeillustrated.com";
export const CONTACT_SEND_FAILED = `We couldn't send your message. Please try again, or email us at ${CONTACT_EMAIL}.`;

export const contactSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(200),
  email: z.string().trim().email("Please enter a valid email address").max(320),
  phone: z.string().trim().min(10, "Please enter a valid phone number").max(40),
  course: z.string().trim().min(1, "Please select a course").max(100),
  message: z.string().trim().min(10, "Message must be at least 10 characters").max(5000),
  website: z.string().max(200).optional(),
});

export type ContactInput = z.infer<typeof contactSchema>;

/** Send the form to /api/contact. Returns an error to show, or null if it was sent. */
export async function submitContact(data: ContactInput): Promise<string | null> {
  try {
    const res = await fetch("/academy/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) return null;
    const body = await res.json().catch(() => ({}));
    return body.error || CONTACT_SEND_FAILED;
  } catch {
    return CONTACT_SEND_FAILED;
  }
}
