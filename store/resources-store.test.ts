import { describe, expect, it } from "vitest";
import { MOCKUP_RESOURCES, useResourcesStore } from "./resources-store";

describe("getResourcesByCourse", () => {
  it("returns only resources for the given course id", () => {
    const results = useResourcesStore.getState().getResourcesByCourse("react");
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((r) => r.courseId === "react")).toBe(true);
  });

  it("returns an empty array for a course with no resources", () => {
    const results = useResourcesStore.getState().getResourcesByCourse("no-such-course");
    expect(results).toEqual([]);
  });
});

describe("getAllResources", () => {
  it("returns the full resources list", () => {
    const results = useResourcesStore.getState().getAllResources();
    expect(results.length).toBe(useResourcesStore.getState().resources.length);
  });

  it("does not include MOCKUP_RESOURCES, which is a separate export", () => {
    const results = useResourcesStore.getState().getAllResources();
    const mockupIds = new Set(MOCKUP_RESOURCES.map((r) => r.id));
    expect(results.some((r) => mockupIds.has(r.id))).toBe(false);
  });

  it("every resource has the required shape", () => {
    const results = useResourcesStore.getState().getAllResources();
    for (const resource of results) {
      expect(resource.id).toBeTruthy();
      expect(resource.courseId).toBeTruthy();
      expect(resource.title).toBeTruthy();
      expect(resource.fileUrl).toBeTruthy();
      expect(["pdf", "document", "video", "code", "image"]).toContain(
        resource.fileType
      );
    }
  });
});

describe("MOCKUP_RESOURCES", () => {
  it("is a non-empty array of image-type resources", () => {
    expect(MOCKUP_RESOURCES.length).toBeGreaterThan(0);
    expect(MOCKUP_RESOURCES.every((r) => r.fileType === "image")).toBe(true);
  });
});
