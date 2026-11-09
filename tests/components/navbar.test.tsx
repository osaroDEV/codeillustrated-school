import * as React from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Navbar } from "@/components/Navbar";

// React 19 exports act, but the installed @types/react doesn't list it yet.
const act = (React as unknown as { act: (fn: () => unknown) => Promise<void> }).act;

const { auth } = vi.hoisted(() => ({
  auth: {
    session: null as object | null,
    listener: null as null | ((event: string, session: object | null) => void),
    unsubscribe: vi.fn(),
  },
}));

vi.mock("@/lib/auth", () => ({ getSession: async () => auth.session }));
vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      onAuthStateChange: (fn: (event: string, session: object | null) => void) => {
        auth.listener = fn;
        return { data: { subscription: { unsubscribe: auth.unsubscribe } } };
      },
    },
  },
}));
vi.mock("next/image", () => ({ default: () => null }));
vi.mock("framer-motion", async () => {
  const React = await import("react");
  return {
    motion: new Proxy(
      {},
      {
        get: (_t, tag: string) => ({ initial, animate, exit, ...rest }: Record<string, unknown>) => {
          void [initial, animate, exit];
          return React.createElement(tag, rest);
        },
      }
    ),
  };
});

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
let host: HTMLDivElement;

const links = (scope: string) =>
  Array.from(host.querySelectorAll<HTMLAnchorElement>(`${scope} a`)).map((a) => [a.textContent?.trim(), a.getAttribute("href")]);
const desktop = () => links("header .md\\:flex.space-x-4");
const mobile = () => links('nav[aria-label="Mobile navigation"]');

async function render() {
  await act(async () => root.render(<Navbar />));
}

async function openMobileMenu() {
  await act(async () => {
    host.querySelector<HTMLButtonElement>("header .md\\:hidden button")!.click();
  });
}

beforeEach(() => {
  auth.session = null;
  auth.listener = null;
  auth.unsubscribe.mockClear();
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe("Navbar account links", () => {
  it("shows visitors Log in and Get Started on desktop", async () => {
    await render();
    expect(desktop()).toEqual([
      ["Log in", "/auth/login"],
      ["Get Started", "/auth/signup"],
    ]);
  });

  it("shows them in the mobile menu, with no WhatsApp link", async () => {
    await render();
    await openMobileMenu();
    expect(mobile()).toEqual(
      expect.arrayContaining([
        ["Log in", "/auth/login"],
        ["Get Started", "/auth/signup"],
      ])
    );
    expect(host.innerHTML).not.toContain("wa.me");
  });

  it("shows signed-in people only My Dashboard", async () => {
    auth.session = { user: { id: "u1" } };
    await render();
    await openMobileMenu();
    expect(desktop()).toEqual([["My Dashboard", "/dashboard"]]);
    expect(mobile()).toContainEqual(["My Dashboard", "/dashboard"]);
    expect(host.textContent).not.toContain("Log in");
    expect(host.textContent).not.toContain("Get Started");
  });

  it("switches when someone signs in or out", async () => {
    await render();
    await act(async () => auth.listener!("SIGNED_IN", { user: { id: "u1" } }));
    expect(desktop()).toEqual([["My Dashboard", "/dashboard"]]);
    await act(async () => auth.listener!("SIGNED_OUT", null));
    expect(desktop()[0]).toEqual(["Log in", "/auth/login"]);
  });

  it("stops listening when it unmounts", async () => {
    const other = createRoot(document.createElement("div"));
    await act(async () => other.render(<Navbar />));
    await act(async () => other.unmount());
    expect(auth.unsubscribe).toHaveBeenCalledTimes(1);
  });
});
