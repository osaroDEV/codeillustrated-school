// Cheap checks that stop simple signup bots before the CAPTCHA does.
//
// In November 2026 a bot loaded /signup and submitted the form 1–2 seconds
// later, about once an hour, with random names and other people's email
// addresses, so the site sent them verification emails. A person can't fill
// in four fields that fast.

/** Below this, the form was filled in too fast for a person. */
export const MIN_FORM_MS = 3000;

/**
 * Name of the hidden signup field. People never see it, so anything typed
 * into it came from a bot. Deliberately not a name browsers autofill.
 */
export const HONEYPOT_FIELD = "ci_extra_field";

export type SignupScreen = "ok" | "honeypot" | "too_fast";

/**
 * `formMs` is the time from the form appearing to it being submitted, measured
 * by the signup page. Requests that don't come from that page have none.
 */
export function screenSignup({ formMs, honeypot }: { formMs?: number; honeypot?: string }): SignupScreen {
  if (honeypot && honeypot.trim()) return "honeypot";
  if (typeof formMs !== "number" || !Number.isFinite(formMs) || formMs < MIN_FORM_MS) return "too_fast";
  return "ok";
}
