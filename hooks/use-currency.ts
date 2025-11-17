"use client"

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { detectUserLocation, isNigeria } from '@/lib/geolocation';

export type Currency = 'NGN' | 'USD';

export interface CurrencySymbol {
  NGN: '₦';
  USD: '$';
}

interface CurrencyStore {
  currency: Currency;
  countryCode: string | null;
  isLoading: boolean;
  isDetected: boolean;
  setCurrency: (currency: Currency) => void;
  detectAndSetCurrency: () => Promise<void>;
}

/**
 * Currency store with automatic location detection
 * Persists currency preference in localStorage
 */
export const useCurrencyStore = create<CurrencyStore>()(
  persist(
    (set, get) => ({
      currency: 'USD',
      countryCode: null,
      isLoading: false,
      isDetected: false,

      setCurrency: (currency: Currency) => {
        set({ currency, isDetected: true });
      },

      /**
       * Detects user location and automatically sets currency
       * - Nigeria (NG) → NGN (₦)
       * - All other countries → USD ($)
       */
      detectAndSetCurrency: async () => {
        const { isDetected } = get();

        // Skip if already detected in this session
        if (isDetected) return;

        set({ isLoading: true });

        try {
          const locationData = await detectUserLocation();
          const detectedCurrency: Currency = isNigeria(locationData.country_code) ? 'NGN' : 'USD';

          set({
            currency: detectedCurrency,
            countryCode: locationData.country_code,
            isLoading: false,
            isDetected: true,
          });
        } catch (error) {
          console.error('Currency detection failed:', error);
          set({
            currency: 'USD',
            isLoading: false,
            isDetected: true,
          });
        }
      },
    }),
    {
      name: 'currency-storage',
      // Only persist currency and detection status
      partialize: (state) => ({
        currency: state.currency,
        isDetected: state.isDetected,
      }),
    }
  )
);

/**
 * Hook for currency detection and management
 * Automatically detects location on first mount
 */
export function useCurrency() {
  const { currency, isLoading, detectAndSetCurrency, setCurrency } = useCurrencyStore();

  return {
    currency,
    isLoading,
    detectAndSetCurrency,
    setCurrency,
    symbol: currency === 'NGN' ? '₦' : '$',
  };
}
