"use client";

import { useCurrency } from "@/hooks/use-currency";
import type { PriceTier } from "@/lib/course-types";
import { cn } from "@/lib/utils";

interface PriceDisplayProps {
  price: PriceTier;
  className?: string;
  showPeriod?: boolean;
}

export function PriceDisplay({
  price,
  className,
  showPeriod = true,
}: PriceDisplayProps) {
  const { currency, symbol, isLoading } = useCurrency();

  const amount = currency === "NGN" ? price.ngn : price.usd;

  if (isLoading) {
    return (
      <span className={cn("animate-pulse bg-slate-200 rounded h-8 w-24 inline-block", className)} />
    );
  }

  return (
    <span className={cn("font-black", className)}>
      {symbol}
      {amount.toLocaleString()}
      {showPeriod && <span className="text-sm font-medium text-slate-500 ml-1">/mo</span>}
    </span>
  );
}
