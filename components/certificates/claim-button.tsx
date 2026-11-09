"use client";

import { useState } from "react";
import { Award, Loader2 } from "lucide-react";
import { useCurrency } from "@/hooks/use-currency";
import type { PriceTier } from "@/lib/course-types";
import { PriceDisplay } from "@/components/price-display";

export function ClaimCertificateButton({ courseId, price }: { courseId: string; price: PriceTier | null }) {
  const { currency } = useCurrency();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function claim() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/academy/api/certificates/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ course_id: courseId, currency }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't claim your certificate. Please try again.");
      window.location.href = data.link ?? `/academy/certificates/${data.code}`;
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        onClick={claim}
        disabled={busy}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-[#c31d24] to-[#f5a623] hover:opacity-90 disabled:opacity-60"
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Award className="w-4 h-4" />}
        {price ? (
          <>
            Get certificate for <PriceDisplay price={price} showPeriod={false} className="font-semibold" />
          </>
        ) : (
          "Get your certificate"
        )}
      </button>
      {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
    </div>
  );
}
