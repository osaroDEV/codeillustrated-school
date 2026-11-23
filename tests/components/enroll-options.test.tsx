import * as React from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { EnrollOptions } from "@/components/enroll-options";
import type { Course } from "@/lib/course-types";

// React 19 exports act, but the installed @types/react doesn't list it yet.
const act = (React as unknown as { act: (fn: () => unknown) => Promise<void> }).act;

vi.mock("@/hooks/use-currency", () => ({ useCurrency: () => ({ currency: "USD", symbol: "$", isLoading: false }) }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const group = { kind: "cohort_group" as const, price: { usd: 50, ngn: 75000 } };
const selfPaced = { kind: "self_paced" as const, price: { usd: 10, ngn: 15000 }, yearlyPrice: { usd: 100, ngn: 150000 } };
const course = (offerings: Course["offerings"]) =>
  ({ id: "c1", slug: "c", price: { group: group.price }, offerings }) as unknown as Course;

const fetchMock = vi.fn();
let root: Root;
let host: HTMLDivElement;

const button = (text: string) => Array.from(host.querySelectorAll("button")).find((b) => b.textContent?.trim() === text);
const render = (c: Course) => act(async () => root.render(<EnrollOptions course={c} />));

beforeEach(() => {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  fetchMock.mockReset().mockResolvedValue(new Response(JSON.stringify({ error: "stop here" }), { status: 400 }));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});

describe("EnrollOptions self-paced", () => {
  it("isn't offered until an admin puts it on sale", async () => {
    await render(course([group]));
    expect(host.textContent).not.toContain("Self-paced");
  });

  it("charges monthly by default", async () => {
    await render(course([group, selfPaced]));
    expect(host.textContent).toContain("$10");
    await act(async () => button("Enrol self-paced")!.click());
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ course_id: "c1", kind: "self_paced", currency: "USD", interval: "monthly" });
  });

  it("switches to the yearly price and charges yearly", async () => {
    await render(course([group, selfPaced]));
    await act(async () => button("yearly")!.click());
    expect(host.textContent).toContain("$100");
    expect(host.textContent).toContain("/ year");
    await act(async () => button("Enrol self-paced")!.click());
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ kind: "self_paced", interval: "yearly" });
  });

  it("hides the choice when there's no yearly price", async () => {
    await render(course([{ ...selfPaced, yearlyPrice: undefined }]));
    expect(button("yearly")).toBeUndefined();
    expect(host.textContent).toContain("Self-paced");
  });

  it("keeps live classes monthly", async () => {
    await render(course([group, selfPaced]));
    await act(async () => button("yearly")!.click());
    await act(async () => button("Enrol in group classes")!.click());
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ kind: "cohort_group", interval: "monthly" });
  });
});

describe("EnrollOptions for signed-out visitors", () => {
  it("sends them to sign up, returning to this course afterwards", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }));
    const location = { href: "" };
    vi.stubGlobal("location", location);
    await render(course([group]));
    await act(async () => button("Enrol in group classes")!.click());
    expect(location.href).toBe("/signup?redirectTo=%2Fcourses%2Fc%23enroll");
  });
});

describe("EnrollOptions without online sales", () => {
  it("keeps WhatsApp enrolment for catalogue-only courses", async () => {
    await render(course(undefined));
    expect(button("Enrol in group classes")).toBeUndefined();
    const enrol = Array.from(host.querySelectorAll("a")).find((a) => a.textContent?.trim() === "Enrol on WhatsApp");
    expect(enrol?.getAttribute("href")).toContain("wa.me");
    expect(host.textContent).not.toContain("Flutterwave");
  });
});

describe("EnrollOptions formats", () => {
  it("offers group classes and self-paced only, never 1-on-1", async () => {
    await render(course([group, selfPaced, { kind: "cohort_1on1", price: { usd: 85, ngn: 120000 } }] as never));
    expect(host.textContent).toContain("Live group classes");
    expect(host.textContent).toContain("Self-paced");
    expect(host.textContent).not.toMatch(/1-on-1/i);
    expect(host.textContent).not.toMatch(/lifetime access/i);
  });
});
