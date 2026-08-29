import { describe, expect, it } from "vitest";
import {
  BASE_PATH,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_URL,
  getCanonicalUrl,
  getOpenGraphDefaults,
  getTwitterDefaults,
} from "./seo";

describe("SEO constants", () => {
  it("SITE_URL is the production origin with no trailing slash", () => {
    expect(SITE_URL).toBe("https://codeillustrated.com");
  });

  it("BASE_PATH starts with a slash and has no trailing slash", () => {
    expect(BASE_PATH.startsWith("/")).toBe(true);
    expect(BASE_PATH.endsWith("/")).toBe(false);
  });

  it("SITE_NAME and SITE_DESCRIPTION are non-empty strings", () => {
    expect(SITE_NAME.length).toBeGreaterThan(0);
    expect(SITE_DESCRIPTION.length).toBeGreaterThan(0);
  });
});

describe("getCanonicalUrl", () => {
  it("defaults to the site root when called with no path", () => {
    expect(getCanonicalUrl()).toBe(`${SITE_URL}${BASE_PATH}`);
  });

  it("returns the site root for an explicit '/' path", () => {
    expect(getCanonicalUrl("/")).toBe(`${SITE_URL}${BASE_PATH}`);
  });

  it("prefixes a leading-slash path with the base path", () => {
    expect(getCanonicalUrl("/courses")).toBe(`${SITE_URL}${BASE_PATH}/courses`);
  });

  it("adds a leading slash when the given path is missing one", () => {
    expect(getCanonicalUrl("courses")).toBe(`${SITE_URL}${BASE_PATH}/courses`);
  });

  it("supports nested paths", () => {
    expect(getCanonicalUrl("/courses/react")).toBe(
      `${SITE_URL}${BASE_PATH}/courses/react`
    );
  });
});

describe("getOpenGraphDefaults", () => {
  it("fills in site defaults when called with no overrides", () => {
    const og = getOpenGraphDefaults();
    expect(og.type).toBe("website");
    expect(og.locale).toBe("en_US");
    expect(og.siteName).toBe(SITE_NAME);
    expect(og.title).toBe(SITE_NAME);
    expect(og.description).toBe(SITE_DESCRIPTION);
    expect(og.url).toBe(getCanonicalUrl());
    expect(og.images).toHaveLength(1);
    expect(og.images[0].url).toBe(`${SITE_URL}${BASE_PATH}/code-ill.svg`);
  });

  it("uses a provided title/description/url over the defaults", () => {
    const og = getOpenGraphDefaults({
      title: "Custom title",
      description: "Custom description",
      url: "https://example.com/custom",
    });
    expect(og.title).toBe("Custom title");
    expect(og.description).toBe("Custom description");
    expect(og.url).toBe("https://example.com/custom");
  });

  it("uses provided images over the default image", () => {
    const customImages = [
      { url: "https://example.com/a.png", width: 100, height: 100, alt: "a" },
    ];
    const og = getOpenGraphDefaults({ images: customImages });
    expect(og.images).toBe(customImages);
  });

  it("leaves unspecified fields at their default when only one override is given", () => {
    const og = getOpenGraphDefaults({ title: "Only title" });
    expect(og.title).toBe("Only title");
    expect(og.description).toBe(SITE_DESCRIPTION);
  });
});

describe("getTwitterDefaults", () => {
  it("fills in site defaults when called with no overrides", () => {
    const tw = getTwitterDefaults();
    expect(tw.card).toBe("summary_large_image");
    expect(tw.title).toBe(SITE_NAME);
    expect(tw.description).toBe(SITE_DESCRIPTION);
    expect(tw.images).toEqual([`${SITE_URL}${BASE_PATH}/code-ill.svg`]);
  });

  it("uses a provided title/description over the defaults", () => {
    const tw = getTwitterDefaults({
      title: "Custom title",
      description: "Custom description",
    });
    expect(tw.title).toBe("Custom title");
    expect(tw.description).toBe("Custom description");
  });

  it("uses provided images over the default image", () => {
    const tw = getTwitterDefaults({ images: ["https://example.com/a.png"] });
    expect(tw.images).toEqual(["https://example.com/a.png"]);
  });

  it("card type is always summary_large_image regardless of overrides", () => {
    const tw = getTwitterDefaults({ title: "x" });
    expect(tw.card).toBe("summary_large_image");
  });
});
