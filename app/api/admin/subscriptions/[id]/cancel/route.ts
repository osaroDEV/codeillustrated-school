import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { rejectNonAdmin } from "@/lib/supabase-server";
import { cancelSubscriptionById } from "@/lib/billing-server";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: Params) {
  const denied = await rejectNonAdmin();
  if (denied) return denied;

  const { id } = await params;
  try {
    const changed = await cancelSubscriptionById(createAdminClient(), id);
    if (!changed) return NextResponse.json({ error: "That subscription isn't active." }, { status: 409 });
    return NextResponse.json({ cancelled: true });
  } catch (err) {
    console.error("Admin cancel failed:", err);
    return NextResponse.json({ error: `Flutterwave: ${(err as Error).message}` }, { status: 502 });
  }
}
