"use client"

import { useEffect } from 'react';
import { useCurrencyStore } from '@/hooks/use-currency';

/**
 * Currency Provider Component
 * Automatically detects user's location and sets currency on app initialization
 *
 * Place this component at the root of your app (in layout.tsx)
 */
export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const { detectAndSetCurrency } = useCurrencyStore();

  useEffect(() => {
    detectAndSetCurrency();
  }, [detectAndSetCurrency]);

  return <>{children}</>;
}
