import { describe, expect, it } from "vitest";
import { cn, safeRedirectPath } from "./utils";

describe("cn", () => {
  it("joins plain string class names", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("drops falsy values", () => {
    expect(cn("a", false, null, undefined, "", "b")).toBe("a b");
  });

  it("applies conditional classes via object syntax", () => {
    expect(cn("base", { active: true, disabled: false })).toBe("base active");
  });

  it("flattens arrays of class names", () => {
    expect(cn(["a", "b"], "c")).toBe("a b c");
  });

  it("resolves conflicting tailwind utility classes, keeping the last one", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });

  it("returns an empty string when given no meaningful input", () => {
    expect(cn()).toBe("");
    expect(cn(false, null, undefined)).toBe("");
  });
});

describe("safeRedirectPath", () => {
  it("keeps paths on this site", () => {
    expect(safeRedirectPath("/courses/x#enroll", "/dashboard")).toBe("/courses/x#enroll");
    expect(safeRedirectPath("/dashboard/billing?x=1", "/dashboard")).toBe("/dashboard/billing?x=1");
  });

  it.each(["https://evil.test", "//evil.test", "/\\evil.test", "evil.test", "javascript:alert(1)", "", null, undefined])(
    "falls back for %s",
    (value) => {
      expect(safeRedirectPath(value, "/dashboard")).toBe("/dashboard");
    }
  );
});
