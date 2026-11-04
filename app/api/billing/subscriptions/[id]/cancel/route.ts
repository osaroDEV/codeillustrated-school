import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { requireVerifiedUserApi } from "@/lib/supabase-server";
import { cancelSubscriptionById } from "@/lib/billing-server";

type Params = { params: Promise<{ id: string }> };

// POST — a learner cancels their own subscription. Billing stops now; the
// seat lasts until the end of the period already paid for.
export async function POST(_req: NextRequest, { params }: Params) {
  const auth = await requireVerifiedUserApi();
  if (auth.response) return auth.response;

  const { id } = await params;
  const admin = createAdminClient();
  const { data: sub } = await admin.from("subscriptions").select("id, user_id").eq("id", id).maybeSingle();
  if (!sub || sub.user_id !== auth.user.id) {
    return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
  }

  try {
    const changed = await cancelSubscriptionById(admin, id);
    return NextResponse.json({ cancelled: changed });
  } catch (err) {
    console.error("Learner cancel failed:", err);
    return NextResponse.json(
      { error: "We couldn't cancel with our payment provider. Please try again, or contact us." },
      { status: 502 }
    );
  }
}
