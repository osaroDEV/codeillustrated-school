// Transactional email through Brevo's API (the same account the newsletter
// signup uses). Best effort: a missing key or a Brevo error is logged and
// never fails the payment flow that triggered the email.

const FROM_EMAIL = () => process.env.RECEIPT_FROM_EMAIL || "info@codeillustrated.com";
const FROM_NAME = "Code Illustrated";

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function sendEmail(input: {
  to: string;
  toName?: string | null;
  /** Where replies should go, when that isn't the sender. */
  replyTo?: { email: string; name?: string };
  subject: string;
  /** Plain-text paragraphs; rendered as both text and simple HTML. */
  paragraphs: string[];
}): Promise<boolean> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.warn("sendEmail: BREVO_API_KEY is not set; skipped", input.subject);
    return false;
  }
  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": apiKey, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        sender: { email: FROM_EMAIL(), name: FROM_NAME },
        to: [{ email: input.to, name: input.toName || undefined }],
        replyTo: input.replyTo,
        subject: input.subject,
        textContent: input.paragraphs.join("\n\n"),
        htmlContent: input.paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join(""),
      }),
    });
    if (!res.ok) {
      console.error("sendEmail: Brevo error", res.status, await res.text().catch(() => ""));
      return false;
    }
    return true;
  } catch (err) {
    console.error("sendEmail failed:", err);
    return false;
  }
}
