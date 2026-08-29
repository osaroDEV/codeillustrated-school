import { beforeEach, describe, expect, it, vi } from "vitest";

const detectUserLocation = vi.fn();

vi.mock("@/lib/geolocation", () => ({
  detectUserLocation: (...args: unknown[]) => detectUserLocation(...args),
  isNigeria: (code: string | undefined) => code === "NG",
}));

import { useCurrency } from "./use-currency";

beforeEach(() => {
  localStorage.clear();
  detectUserLocation.mockReset();
  useCurrency.setState({ currency: "USD", symbol: "$", isLoading: true });
});

describe("setCurrency", () => {
  it("sets NGN with the naira symbol and clears loading", () => {
    useCurrency.getState().setCurrency("NGN");
    const state = useCurrency.getState();
    expect(state.currency).toBe("NGN");
    expect(state.symbol).toBe("₦");
    expect(state.isLoading).toBe(false);
  });

  it("sets USD with the dollar symbol and clears loading", () => {
    useCurrency.getState().setCurrency("USD");
    const state = useCurrency.getState();
    expect(state.currency).toBe("USD");
    expect(state.symbol).toBe("$");
    expect(state.isLoading).toBe(false);
  });

  it("persists the chosen currency to localStorage under 'currency-storage'", () => {
    useCurrency.getState().setCurrency("NGN");
    const stored = JSON.parse(localStorage.getItem("currency-storage")!);
    expect(stored.state.currency).toBe("NGN");
  });
});

describe("detectAndSetCurrency", () => {
  it("sets NGN when geolocation resolves to Nigeria", async () => {
    detectUserLocation.mockResolvedValue({ country_code: "NG", country_name: "Nigeria" });
    await useCurrency.getState().detectAndSetCurrency();
    const state = useCurrency.getState();
    expect(state.currency).toBe("NGN");
    expect(state.symbol).toBe("₦");
    expect(state.isLoading).toBe(false);
  });

  it("sets USD when geolocation resolves to a non-Nigeria country", async () => {
    detectUserLocation.mockResolvedValue({
      country_code: "US",
      country_name: "United States",
    });
    await useCurrency.getState().detectAndSetCurrency();
    const state = useCurrency.getState();
    expect(state.currency).toBe("USD");
    expect(state.symbol).toBe("$");
    expect(state.isLoading).toBe(false);
  });

  it("falls back to USD and clears loading when geolocation rejects", async () => {
    detectUserLocation.mockRejectedValue(new Error("boom"));
    await useCurrency.getState().detectAndSetCurrency();
    const state = useCurrency.getState();
    expect(state.currency).toBe("USD");
    expect(state.symbol).toBe("$");
    expect(state.isLoading).toBe(false);
  });

  it("leaves isLoading true only until detection resolves", async () => {
    expect(useCurrency.getState().isLoading).toBe(true);
    detectUserLocation.mockResolvedValue({ country_code: "US", country_name: "United States" });
    await useCurrency.getState().detectAndSetCurrency();
    expect(useCurrency.getState().isLoading).toBe(false);
  });
});
