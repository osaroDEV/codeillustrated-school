import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { rejectNonAdmin } from "@/lib/supabase-server";
import { dbErrorResponse } from "@/lib/cohorts";

type Params = { params: Promise<{ id: string }> };

// POST — record that a charge was refunded in the Flutterwave dashboard.
// This doesn't move money. Refunding a first charge also ends the seat.
export async function POST(_req: NextRequest, { params }: Params) {
  const denied = await rejectNonAdmin();
  if (denied) return denied;

  const { id } = await params;
  const { error } = await createAdminClient().rpc("mark_order_refunded", { p_order_id: id });
  if (error?.code === "CI005") {
    return NextResponse.json({ error: "Only paid charges can be marked refunded." }, { status: 409 });
  }
  if (error) return dbErrorResponse(error);
  return NextResponse.json({ success: true });
}
