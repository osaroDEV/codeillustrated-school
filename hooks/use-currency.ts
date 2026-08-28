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
      // Starts true so callers can show a loading state until geolocation
      // resolves, even though the persisted currency may already be known.
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
          // Detection failure should never leave the UI stuck loading —
          // fall back to USD rather than surfacing an error to the user.
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
