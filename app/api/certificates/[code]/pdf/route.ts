import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { appUrl } from "@/lib/billing-server";
import { renderCertificatePdf } from "@/lib/certificate-pdf";

type Params = { params: Promise<{ code: string }> };

// GET — the certificate as a PDF. Anyone with the code can download it, like
// the public page; a certificate only exists once it has been earned and paid for.
export async function GET(_req: NextRequest, { params }: Params) {
  const code = (await params).code.toUpperCase();
  const { data } = await createAdminClient()
    .from("certificates")
    .select("code, learner_name, course_title, issued_at, revoked_at")
    .eq("code", code)
    .maybeSingle();
  if (!data || data.revoked_at) return NextResponse.json({ error: "Certificate not found" }, { status: 404 });

  const pdf = await renderCertificatePdf({
    name: data.learner_name,
    courseTitle: data.course_title,
    issuedAt: data.issued_at,
    code: data.code,
    verifyUrl: `${appUrl()}/certificates/${data.code}`,
  });
  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="certificate-${data.code}.pdf"`,
    },
  });
}
