import { describe, expect, it } from "vitest";
import { MIN_FORM_MS, screenSignup } from "./signup-guard";

describe("screenSignup", () => {
  it("lets through a form that took a person's time", () => {
    expect(screenSignup({ formMs: 12_000 })).toBe("ok");
    expect(screenSignup({ formMs: MIN_FORM_MS, honeypot: "  " })).toBe("ok");
  });

  it("stops forms submitted faster than a person can type", () => {
    expect(screenSignup({ formMs: 1_500 })).toBe("too_fast");
  });

  it("stops requests that didn't come from the signup page", () => {
    expect(screenSignup({})).toBe("too_fast");
    expect(screenSignup({ formMs: Number.NaN })).toBe("too_fast");
  });

  it("catches the hidden field being filled in", () => {
    expect(screenSignup({ formMs: 12_000, honeypot: "http://spam.test" })).toBe("honeypot");
  });
});
