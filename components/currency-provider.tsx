"use client";

import { useEffect } from "react";
import { useCurrency } from "@/hooks/use-currency";

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const detectAndSetCurrency = useCurrency((state) => state.detectAndSetCurrency);

  useEffect(() => {
    // Only detect if no currency is set or we want to re-check
    // For now, we'll just run it once on initial mount
    detectAndSetCurrency();
  }, [detectAndSetCurrency]);

  return <>{children}</>;
}
