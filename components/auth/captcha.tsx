"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Cloudflare Turnstile widget for the account pages (see lib/turnstile.ts).
// Without NEXT_PUBLIC_TURNSTILE_SITE_KEY it renders nothing and `ready` is
// always true, so the forms behave exactly as before.

interface TurnstileApi {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

let scriptPromise: Promise<void> | null = null;
function loadTurnstile(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => {
        scriptPromise = null;
        reject(new Error("Couldn't load the security check."));
      };
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
}

export interface Captcha {
  /** The widget to place in the form (null when CAPTCHA is off). */
  widget: React.ReactNode;
  /** The current single-use token, if the check has passed. */
  token: string | undefined;
  /** Whether the form can be submitted. */
  ready: boolean;
  /** A token is spent once used: call after every submit, successful or not. */
  reset: () => void;
  error: string;
}

export function useCaptcha(): Captcha {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const container = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const [token, setToken] = useState<string | undefined>();
  const [error, setError] = useState("");

  useEffect(() => {
    if (!siteKey) return;
    let cancelled = false;
    loadTurnstile()
      .then(() => {
        if (cancelled || !container.current || !window.turnstile) return;
        widgetId.current = window.turnstile.render(container.current, {
          sitekey: siteKey,
          theme: "dark",
          callback: (t: string) => {
            setToken(t);
            setError("");
          },
          "expired-callback": () => setToken(undefined),
          "error-callback": () => {
            setToken(undefined);
            setError("The security check didn't load. Refresh the page and try again.");
          },
        });
      })
      .catch((err: Error) => setError(err.message));
    return () => {
      cancelled = true;
      if (widgetId.current) window.turnstile?.remove(widgetId.current);
      widgetId.current = null;
    };
  }, [siteKey]);

  const reset = useCallback(() => {
    setToken(undefined);
    if (widgetId.current) window.turnstile?.reset(widgetId.current);
  }, []);

  return {
    widget: siteKey ? <div ref={container} className="flex min-h-[65px] justify-center" /> : null,
    token,
    ready: !siteKey || !!token,
    reset,
    error,
  };
}
