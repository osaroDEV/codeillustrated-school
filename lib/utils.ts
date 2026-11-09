import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * A redirect target from the address bar, limited to this site. Anything else
 * (https://…, //host, /\\host) falls back, so a crafted login link can't send
 * someone to another website after they sign in.
 */
export function safeRedirectPath(value: string | null | undefined, fallback: string): string {
  if (!value || !value.startsWith("/") || value[1] === "/" || value[1] === "\\") return fallback;
  return value;
}
