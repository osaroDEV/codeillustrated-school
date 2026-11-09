import type { User } from "@supabase/supabase-js";
import type { createAdminClient } from "./supabase";
import { newCertificateCode, newCertificateTxRef, type Currency } from "./billing";
import { appUrl, CheckoutError } from "./billing-server";
import { createCheckoutLink } from "./flutterwave";

type AdminClient = ReturnType<typeof createAdminClient>;

export type CertificateCost = { free: true } | { free: false; amount: number } | { unavailable: true };

/**
 * What a certificate costs. Both prices empty means free. A price set in only
 * one currency can't be charged in the other, rather than being free there.
 */
export function certificateCost(
  course: { certificate_price_usd?: number | string | null; certificate_price_ngn?: number | string | null },
  currency: Currency
): CertificateCost {
  const usd = Number(course.certificate_price_usd ?? 0);
  const ngn = Number(course.certificate_price_ngn ?? 0);
  if (usd <= 0 && ngn <= 0) return { free: true };
  const amount = currency === "NGN" ? ngn : usd;
  return amount > 0 ? { free: false, amount } : { unavailable: true };
}

/** Issue a free certificate, or start paying for one. */
export async function claimCertificate(
  admin: AdminClient,
  user: User,
  input: { courseId: string; currency: Currency }
): Promise<{ code: string } | { link: string }> {
  if (!user.email) throw new CheckoutError("Your account has no email address.", 400);
  const [{ data: enrollment }, { data: course }, { data: profile }, { data: existing }] = await Promise.all([
    admin.from("enrollments").select("status").eq("user_id", user.id).eq("course_id", input.courseId).maybeSingle(),
    admin.from("courses").select("id, title, certificate_price_usd, certificate_price_ngn").eq("id", input.courseId).maybeSingle(),
    admin.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
    admin.from("certificates").select("code, revoked_at").eq("user_id", user.id).eq("course_id", input.courseId).maybeSingle(),
  ]);
  if (existing && !existing.revoked_at) return { code: existing.code as string };
  if (enrollment?.status !== "completed") throw new CheckoutError("Finish this course to claim its certificate.", 403);
  if (!course) throw new CheckoutError("Course not found.", 404);
  if (!profile?.full_name?.trim()) {
    throw new CheckoutError("Add your full name in Profile first. It's printed on your certificate.", 409);
  }

  const cost = certificateCost(course, input.currency);
  if ("unavailable" in cost) throw new CheckoutError("This certificate can't be paid for in your currency. Please contact us.", 409);

  if (cost.free) {
    const { data, error } = await admin.rpc("issue_certificate", {
      p_user_id: user.id,
      p_course_id: input.courseId,
      p_code: newCertificateCode(),
    });
    if (error || !data) throw new Error(`issue_certificate failed: ${error?.message}`);
    return { code: data as string };
  }

  const txRef = newCertificateTxRef();
  const { data: order, error } = await admin
    .from("orders")
    .insert({
      user_id: user.id,
      customer_email: user.email,
      kind: "one_off",
      course_id: course.id,
      currency: input.currency,
      amount: cost.amount,
      tx_ref: txRef,
    })
    .select("id")
    .single();
  if (error || !order) throw new Error(`Couldn't create order: ${error?.message}`);

  try {
    const link = await createCheckoutLink({
      txRef,
      amount: cost.amount,
      currency: input.currency,
      redirectUrl: `${appUrl()}/checkout/complete`,
      customer: { email: user.email, name: profile.full_name },
      title: course.title,
      description: "Certificate of completion",
      meta: { order_id: order.id, course_id: course.id },
    });
    return { link };
  } catch (err) {
    await admin
      .from("orders")
      .update({ status: "failed", failure_reason: (err as Error).message, updated_at: new Date().toISOString() })
      .eq("id", order.id);
    throw new CheckoutError("We couldn't start the payment. Please try again in a moment.", 502);
  }
}
