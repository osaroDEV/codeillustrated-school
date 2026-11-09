import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase";
import { requireVerifiedUserApi } from "@/lib/supabase-server";
import { resolveCurrency } from "@/lib/billing";
import { CheckoutError } from "@/lib/billing-server";
import { claimCertificate } from "@/lib/certificates";
import { parseBody } from "@/lib/cohorts";

const schema = z.object({ course_id: z.string().trim().min(1), currency: z.enum(["NGN", "USD"]) });

// POST — claim a finished course's certificate. Returns its code if it was
// free or already issued, or a Flutterwave payment link.
export async function POST(req: NextRequest) {
  const auth = await requireVerifiedUserApi();
  if (auth.response) return auth.response;
  const body = await parseBody(req, schema);
  if (body.response) return body.response;

  const currency = resolveCurrency(body.data.currency, req.headers.get("x-vercel-ip-country"));
  try {
    return NextResponse.json(await claimCertificate(createAdminClient(), auth.user, { courseId: body.data.course_id, currency }));
  } catch (err) {
    if (err instanceof CheckoutError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("Certificate claim failed:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
