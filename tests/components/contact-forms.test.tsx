import * as React from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ContactForm } from "@/components/contact-form";
import { ContactFormPopup } from "@/components/contact-form-popup";

// Submits the real forms, so a form that posts somewhere else fails here.

// React 19 exports act, but the installed @types/react doesn't list it yet.
const act = (React as unknown as { act: (fn: () => unknown) => Promise<void> }).act;

const { toast } = vi.hoisted(() => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("sonner", () => ({ toast }));

vi.mock("framer-motion", async () => {
  const React = await import("react");
  const strip = ({ initial, animate, exit, transition, whileInView, viewport, ...rest }: Record<string, unknown>) => {
    void [initial, animate, exit, transition, whileInView, viewport];
    return rest;
  };
  return {
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
    motion: new Proxy({}, { get: (_t, tag: string) => (props: Record<string, unknown>) => React.createElement(tag, strip(props)) }),
  };
});

// Radix's dropdown needs pointer APIs jsdom lacks; a plain select keeps the same contract.
vi.mock("@/components/ui/select", async () => {
  const React = await import("react");
  type P = { children?: React.ReactNode; value?: string; onValueChange?: (v: string) => void };
  return {
    Select: ({ children, value, onValueChange }: P) =>
      React.createElement("select", { value, onChange: (e: { target: { value: string } }) => onValueChange?.(e.target.value) },
        React.createElement("option", { value: "" }), children),
    SelectTrigger: () => null,
    SelectValue: () => null,
    SelectContent: ({ children }: P) => children,
    SelectItem: ({ value, children }: P) => React.createElement("option", { value }, children),
  };
});

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const courses = [{ id: "game-dev-pro", slug: "game-dev", title: "Game Dev Pro" }];
const fetchMock = vi.fn();
let root: Root;
let host: HTMLDivElement;

function setValue(el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, value: string) {
  const proto = Object.getPrototypeOf(el);
  Object.getOwnPropertyDescriptor(proto, "value")!.set!.call(el, value);
  el.dispatchEvent(new Event(el.tagName === "SELECT" ? "change" : "input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

async function fill(values: { email?: string } = {}) {
  await act(async () => {
    setValue(host.querySelector('input[name="name"]')!, "Ada Obi");
    setValue(host.querySelector('input[name="email"]')!, values.email ?? "ada@example.test");
    setValue(host.querySelector('input[name="phone"]')!, "08012345678");
    setValue(host.querySelector("select")!, "game-dev-pro");
    setValue(host.querySelector("textarea")!, "Does my son need any experience?");
  });
}

async function submit() {
  const event = new Event("submit", { bubbles: true, cancelable: true });
  await act(async () => {
    host.querySelector("form")!.dispatchEvent(event);
    await new Promise((resolve) => setTimeout(resolve, 20));
  });
  return event;
}

beforeEach(() => {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  toast.success.mockClear();
  toast.error.mockClear();
  fetchMock.mockReset().mockResolvedValue(new Response(JSON.stringify({ success: true }), { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});

async function renderPage() {
  await act(async () => root.render(<ContactForm courses={courses} />));
}

async function renderPopup() {
  vi.useFakeTimers();
  await act(async () => root.render(<ContactFormPopup courses={courses} />));
  await act(async () => {
    vi.advanceTimersByTime(30_000);
  });
  vi.useRealTimers();
}

describe.each([
  ["Contact Us page", renderPage],
  ["popup", renderPopup],
])("%s", (_name, render) => {
  it("sends through the site's own API and stays on the page", async () => {
    await render();
    const form = host.querySelector("form")!;
    expect(form.getAttribute("action")).toBeNull();

    await fill();
    const event = await submit();

    expect(event.defaultPrevented).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/contact");
    expect(JSON.parse(init.body)).toMatchObject({
      name: "Ada Obi",
      email: "ada@example.test",
      phone: "08012345678",
      course: "game-dev-pro",
      message: "Does my son need any experience?",
    });
    expect(toast.success).toHaveBeenCalledTimes(1);
  });

  it("shows field errors and sends nothing when the form is invalid", async () => {
    await render();
    await fill({ email: "nope" });
    await submit();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(host.textContent).toContain("Please enter a valid email address");
  });

  it("shows an error and keeps what was typed when sending fails", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ error: "Couldn't send." }), { status: 502 }));
    await render();
    await fill();
    await submit();
    expect(toast.error).toHaveBeenCalledWith("Couldn't send.");
    expect(toast.success).not.toHaveBeenCalled();
    expect(host.querySelector<HTMLInputElement>('input[name="name"]')!.value).toBe("Ada Obi");
  });
});
