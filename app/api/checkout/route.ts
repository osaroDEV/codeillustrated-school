import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase";
import { requireVerifiedUserApi } from "@/lib/supabase-server";
import { resolveCurrency } from "@/lib/billing";
import { CheckoutError, startCheckout } from "@/lib/billing-server";
import { parseBody } from "@/lib/cohorts";

const schema = z.object({
  course_id: z.string().trim().min(1),
  kind: z.string().trim().min(1),
  currency: z.enum(["NGN", "USD"]),
});

// POST — start a monthly subscription checkout for a course offering.
// Returns Flutterwave's hosted payment link for the browser to open.
export async function POST(req: NextRequest) {
  const auth = await requireVerifiedUserApi();
  if (auth.response) return auth.response;

  const body = await parseBody(req, schema);
  if (body.response) return body.response;

  const currency = resolveCurrency(body.data.currency, req.headers.get("x-vercel-ip-country"));
  try {
    const { link } = await startCheckout(createAdminClient(), auth.user, {
      courseId: body.data.course_id,
      kind: body.data.kind,
      currency,
    });
    return NextResponse.json({ link, currency });
  } catch (err) {
    if (err instanceof CheckoutError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Checkout failed:", err);
    return NextResponse.json({ error: "Something went wrong starting your payment." }, { status: 500 });
  }
}
