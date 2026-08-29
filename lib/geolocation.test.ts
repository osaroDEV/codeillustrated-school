import { afterEach, describe, expect, it, vi } from "vitest";
import { detectUserLocation, isNigeria } from "./geolocation";

describe("detectUserLocation", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("parses country_code, country_name, and city from a successful response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          country_code: "NG",
          country_name: "Nigeria",
          city: "Lagos",
        }),
      })
    );

    const location = await detectUserLocation();
    expect(location).toEqual({
      country_code: "NG",
      country_name: "Nigeria",
      city: "Lagos",
    });
  });

  it("leaves city undefined when the API omits it", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ country_code: "US", country_name: "United States" }),
      })
    );

    const location = await detectUserLocation();
    expect(location.city).toBeUndefined();
  });

  it("falls back to the US default when the response is not ok", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));

    const location = await detectUserLocation();
    expect(location).toEqual({
      country_code: "US",
      country_name: "United States",
    });
  });

  it("falls back to the US default when fetch itself rejects", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    const location = await detectUserLocation();
    expect(location).toEqual({
      country_code: "US",
      country_name: "United States",
    });
  });

  it("falls back to the US default when the response body isn't valid JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => {
          throw new Error("bad json");
        },
      })
    );

    const location = await detectUserLocation();
    expect(location).toEqual({
      country_code: "US",
      country_name: "United States",
    });
  });

  it("requests the ipapi.co JSON endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ country_code: "US", country_name: "United States" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await detectUserLocation();
    expect(fetchMock).toHaveBeenCalledWith("https://ipapi.co/json/");
  });
});

describe("isNigeria", () => {
  it("returns true for the NG country code", () => {
    expect(isNigeria("NG")).toBe(true);
  });

  it("returns false for other country codes", () => {
    expect(isNigeria("US")).toBe(false);
    expect(isNigeria("GB")).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isNigeria(undefined)).toBe(false);
  });

  it("is case-sensitive — lowercase 'ng' does not match", () => {
    expect(isNigeria("ng")).toBe(false);
  });
});
