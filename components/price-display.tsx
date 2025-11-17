"use client"

import { useCurrency } from '@/hooks/use-currency';
import type { PriceValue } from '@/store/course-store';

interface PriceDisplayProps {
  price: PriceValue;
  className?: string;
  showCurrency?: boolean;
}

/**
 * Reusable Price component that displays prices in user's currency
 * Automatically switches between USD ($) and NGN (₦) based on location
 *
 * Usage:
 * <PriceDisplay price={{ usd: 299, ngn: 450000 }} />
 */
export function PriceDisplay({ price, className = '', showCurrency = true }: PriceDisplayProps) {
  const { currency, symbol } = useCurrency();

  const amount = currency === 'NGN' ? price.ngn : price.usd;
  const formattedAmount = amount.toLocaleString();

  return (
    <span className={className}>
      {symbol}{formattedAmount}
      {showCurrency && (
        <span className="text-xs ml-1 opacity-70">
          {currency}
        </span>
      )}
    </span>
  );
}
