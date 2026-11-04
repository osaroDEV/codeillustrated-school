import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { runDailyBilling } from "@/lib/billing-server";

// Daily (vercel.json): expire lapsed subscriptions and re-check pending
// checkouts. Vercel Cron sends `Authorization: Bearer $CRON_SECRET`.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    return NextResponse.json(await runDailyBilling(createAdminClient()));
  } catch (err) {
    console.error("Daily billing failed:", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
