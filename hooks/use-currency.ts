import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { detectUserLocation, isNigeria } from "@/lib/geolocation";

export type Currency = "NGN" | "USD";

interface CurrencyState {
  currency: Currency;
  symbol: string;
  isLoading: boolean;
  setCurrency: (currency: Currency) => void;
  detectAndSetCurrency: () => Promise<void>;
}

export const useCurrency = create<CurrencyState>()(
  persist(
    (set) => ({
      currency: "USD",
      symbol: "$",
      isLoading: true,
      setCurrency: (currency: Currency) =>
        set({
          currency,
          symbol: currency === "NGN" ? "₦" : "$",
          isLoading: false,
        }),
      detectAndSetCurrency: async () => {
        try {
          const locationData = await detectUserLocation();
          const detectedCurrency: Currency = isNigeria(locationData.country_code)
            ? "NGN"
            : "USD";
          set({
            currency: detectedCurrency,
            symbol: detectedCurrency === "NGN" ? "₦" : "$",
            isLoading: false,
          });
        } catch (error) {
          set({ currency: "USD", symbol: "$", isLoading: false });
        }
      },
    }),
    {
      name: "currency-storage",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
