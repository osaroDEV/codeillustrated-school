import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { webhookHashMatches } from "@/lib/flutterwave";
import { applySubscriptionCancelled, processCharge } from "@/lib/billing-server";

// Flutterwave webhook (Dashboard → Settings → Webhooks, v3, with a secret
// hash). The body is only used to find the transaction: every charge is
// re-verified with Flutterwave's API before anything changes.
//
// Responses: 401 for a bad hash; 500 when processing failed in a way worth
// retrying (Flutterwave retries failed deliveries); 200 otherwise, including
// for events we don't handle.
export async function POST(req: NextRequest) {
  if (!webhookHashMatches(req.headers.get("verif-hash"))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const payload = (await req.json().catch(() => null)) as {
    event?: string;
    "event.type"?: string;
    data?: Record<string, unknown> & { id?: number };
  } | null;
  if (!payload?.data) return NextResponse.json({ received: true });

  const event = payload.event ?? payload["event.type"] ?? "unknown";
  const admin = createAdminClient();

  try {
    if (event === "charge.completed" && payload.data.id) {
      const result = await processCharge(admin, payload.data.id, { event, payload });
      return NextResponse.json({ received: true, outcome: result.outcome });
    }
    if (event === "subscription.cancelled") {
      const result = await applySubscriptionCancelled(admin, payload.data as never, payload);
      return NextResponse.json({ received: true, outcome: result.outcome });
    }
    return NextResponse.json({ received: true, outcome: "ignored" });
  } catch (err) {
    console.error("Flutterwave webhook failed:", event, err);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
