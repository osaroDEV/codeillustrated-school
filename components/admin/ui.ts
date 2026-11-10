// Shared class names for the admin forms.
export const inputClass =
  "w-full bg-white/[0.06] border border-white/10 rounded-xl px-3 py-2 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#1a596c]/60 transition-all";
export const labelClass = "block text-white/50 text-xs mb-1.5 uppercase tracking-wider";
export const cardClass = "bg-white/[0.04] border border-white/[0.08] rounded-2xl";
export const primaryButtonClass =
  "flex items-center justify-center gap-2 bg-gradient-to-r from-[#1a596c] to-[#3da3bc] hover:from-[#174f60] hover:to-[#1a596c] text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all disabled:opacity-60 whitespace-nowrap";
export const secondaryButtonClass =
  "flex items-center gap-1.5 text-white/50 hover:text-white border border-white/10 hover:border-white/20 text-xs px-3 py-2 rounded-xl transition-all disabled:opacity-60";
export const dangerButtonClass =
  "p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400/60 hover:text-red-400 transition-all disabled:opacity-60";
export const errorClass = "px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm";

/** fetch() a JSON admin route; resolves to an error message, or null on success. */
export async function send(path: string, method: string, body?: unknown): Promise<string | null> {
  try {
    const res = await fetch(`/api/admin${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (res.ok) return null;
    const data = await res.json().catch(() => ({}));
    return data.error || `Request failed (${res.status})`;
  } catch {
    return "Network error. Please try again.";
  }
}

/** Like send(), but also returns the JSON body (e.g. a warning) on success. */
export async function request<T = Record<string, unknown>>(
  path: string,
  method: string,
  body?: unknown
): Promise<{ error: string | null; data: T | null }> {
  try {
    const res = await fetch(`/api/admin${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await res.json().catch(() => null);
    if (res.ok) return { error: null, data };
    return { error: data?.error || `Request failed (${res.status})`, data: null };
  } catch {
    return { error: "Network error. Please try again.", data: null };
  }
}
