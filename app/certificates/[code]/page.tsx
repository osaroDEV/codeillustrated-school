import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, Download, XCircle } from "lucide-react";
import { createAdminClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Verify certificate", robots: { index: false, follow: false } };

type Params = { params: Promise<{ code: string }> };

export default async function CertificatePage({ params }: Params) {
  const code = (await params).code.toUpperCase();
  const { data: certificate } = await createAdminClient()
    .from("certificates")
    .select("code, learner_name, course_title, issued_at, revoked_at")
    .eq("code", code)
    .maybeSingle();
  const valid = certificate && !certificate.revoked_at;

  return (
    <main className="pt-32 pb-24 px-6 bg-white min-h-[70vh]">
      <div className="max-w-xl mx-auto text-center">
        {valid ? (
          <>
            <BadgeCheck className="w-14 h-14 text-green-600 mx-auto" />
            <h1 className="text-3xl font-bold mt-4">Valid certificate</h1>
            <p className="text-muted-foreground mt-6">This certifies that</p>
            <p className="text-2xl font-bold mt-1">{certificate.learner_name}</p>
            <p className="text-muted-foreground mt-3">has successfully completed</p>
            <p className="text-xl font-bold text-primary mt-1">{certificate.course_title}</p>
            <p className="text-muted-foreground text-sm mt-4">
              Awarded on{" "}
              {new Date(certificate.issued_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}
              {" · "}
              {certificate.code}
            </p>
            <a
              href={`/api/certificates/${certificate.code}/pdf`}
              className="inline-flex items-center gap-2 mt-8 bg-primary text-white font-bold px-6 py-3 rounded-2xl hover:opacity-90 transition-opacity"
            >
              <Download className="w-4 h-4" /> Download PDF
            </a>
          </>
        ) : (
          <>
            <XCircle className="w-14 h-14 text-slate-400 mx-auto" />
            <h1 className="text-3xl font-bold mt-4">Certificate not valid</h1>
            <p className="text-muted-foreground mt-4">
              We couldn&apos;t find a valid certificate with this code. Check the code, or{" "}
              <Link href="/contact-us" className="text-primary underline">contact us</Link>.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
