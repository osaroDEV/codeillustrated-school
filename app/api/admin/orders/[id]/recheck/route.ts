import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { rejectNonAdmin } from "@/lib/supabase-server";
import { verifyByReference } from "@/lib/flutterwave";
import { processCharge } from "@/lib/billing-server";

type Params = { params: Promise<{ id: string }> };

// POST — ask Flutterwave about a pending checkout and apply the result.
export async function POST(_req: NextRequest, { params }: Params) {
  const denied = await rejectNonAdmin();
  if (denied) return denied;

  const { id } = await params;
  const admin = createAdminClient();
  const { data: order } = await admin.from("orders").select("tx_ref").eq("id", id).maybeSingle();
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  try {
    const tx = await verifyByReference(order.tx_ref);
    if (!tx) return NextResponse.json({ outcome: "not_paid" });
    const result = await processCharge(admin, tx.id, { event: "admin.recheck", payload: { order_id: id } });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: `Flutterwave: ${(err as Error).message}` }, { status: 502 });
  }
}
