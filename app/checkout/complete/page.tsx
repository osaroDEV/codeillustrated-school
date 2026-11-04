import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { requireUser } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase";
import { processCharge } from "@/lib/billing-server";
import { formatMoney } from "@/lib/billing";
import { AutoRefresh } from "@/components/billing/auto-refresh";

export const metadata: Metadata = {
  title: "Payment | Code Illustrated",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

// Flutterwave redirects here after checkout with ?status=&tx_ref=&transaction_id=.
// The query string is never trusted: the transaction is re-verified with
// Flutterwave (the same path the webhook takes, so whichever arrives first
// wins and the other is a no-op), then the page shows the order's state.
export default async function CheckoutCompletePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; tx_ref?: string; transaction_id?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const admin = createAdminClient();

  const loadOrder = async () =>
    params.tx_ref
      ? (
          await admin
            .from("orders")
            .select("id, status, currency, amount, course_id, subscription_id, courses(title, slug), subscriptions(status)")
            .eq("tx_ref", params.tx_ref)
            .eq("user_id", user.id)
            .maybeSingle()
        ).data
      : null;

  let order = await loadOrder();

  if (order?.status === "pending") {
    if (params.transaction_id && /^\d+$/.test(params.transaction_id)) {
      try {
        await processCharge(admin, params.transaction_id, { event: "checkout.redirect", payload: params });
      } catch (err) {
        // The webhook or the daily job will pick it up.
        console.error("Redirect verification failed:", err);
      }
    } else if (params.status === "cancelled") {
      await admin
        .from("orders")
        .update({ status: "cancelled", failure_reason: "Cancelled at checkout", updated_at: new Date().toISOString() })
        .eq("id", order.id)
        .eq("status", "pending");
    }
    order = await loadOrder();
  }

  const course = order?.courses as unknown as { title: string; slug: string } | null;
  const title = course?.title ?? "your course";
  const subStatus = (order?.subscriptions as unknown as { status: string } | null)?.status;

  return (
    <div className="pt-32 pb-24 px-6 bg-white min-h-[70vh]">
      <div className="max-w-lg mx-auto text-center">
        {!order ? (
          <State
            icon={<XCircle className="w-12 h-12 text-slate-400" />}
            title="We couldn't find that payment"
            body="If you were charged, it will appear in your dashboard shortly. Contact us if it doesn't."
          />
        ) : order.status === "paid" && subStatus === "cancelled" ? (
          <State
            icon={<CheckCircle2 className="w-12 h-12 text-accent-500" />}
            title="You already had a seat"
            body={`You were already enrolled in ${title}, so we've stopped this new subscription. We'll refund the ${formatMoney(order.amount, order.currency)} charge.`}
          />
        ) : order.status === "paid" ? (
          <State
            icon={<CheckCircle2 className="w-12 h-12 text-accent-500" />}
            title={`You're enrolled in ${title}!`}
            body={`We received ${formatMoney(order.amount, order.currency)}. Your subscription renews monthly and you can cancel any time. We'll place you in a class group and your schedule will appear in your dashboard.`}
          />
        ) : order.status === "pending" ? (
          <>
            <State
              icon={<Clock className="w-12 h-12 text-primary animate-pulse" />}
              title="Confirming your payment…"
              body="This usually takes a few seconds. You can leave this page; we'll email you once it's confirmed."
            />
            <AutoRefresh />
          </>
        ) : (
          <State
            icon={<XCircle className="w-12 h-12 text-red-500" />}
            title={order.status === "cancelled" ? "Payment cancelled" : "Payment didn't go through"}
            body="You haven't been charged. You can try again from the course page."
          />
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-10">
          <Link
            href="/dashboard"
            className="bg-primary text-white font-bold px-6 py-3 rounded-2xl hover:opacity-90 transition-opacity"
          >
            Go to dashboard
          </Link>
          {order && order.status !== "paid" && (
            <Link
              href={`/courses/${course?.slug ?? order.course_id}#enroll`}
              className="border border-border font-bold px-6 py-3 rounded-2xl hover:bg-slate-50 transition-colors"
            >
              Back to course
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function State({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <>
      <div className="flex justify-center mb-6">{icon}</div>
      <h1 className="text-3xl font-heading font-black mb-4">{title}</h1>
      <p className="text-muted-foreground leading-relaxed">{body}</p>
    </>
  );
}
