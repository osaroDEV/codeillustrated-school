import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { isCronAuthorized, runNotifications } from "@/lib/notifications";

export const maxDuration = 60;

// Queues due class reminders and sends waiting emails. Supabase's scheduler
// calls this every 15 minutes; a daily Vercel Cron is the backstop.
export async function GET(req: NextRequest) {
  const admin = createAdminClient();
  if (!(await isCronAuthorized(admin, req.headers.get("authorization")))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    return NextResponse.json(await runNotifications(admin));
  } catch (err) {
    console.error("Notifications failed:", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
