import { safeRedirectPath } from "@/lib/utils";

// Learner account pages. They used to live under /auth/…; next.config.js
// permanently redirects the old addresses here. /auth/confirm stays where it
// is: the Supabase email templates and redirect allow-lists point at it.
export const LOGIN_PATH = "/login";
export const SIGNUP_PATH = "/signup";
export const FORGOT_PASSWORD_PATH = "/forgot-password";
export const RESET_PASSWORD_PATH = "/reset-password";
export const VERIFY_EMAIL_PATH = "/verify-email";
export const COURSE_FINDER_PATH = "/start";

export const ACCOUNT_PATHS = [
  LOGIN_PATH,
  SIGNUP_PATH,
  FORGOT_PASSWORD_PATH,
  RESET_PASSWORD_PATH,
  VERIFY_EMAIL_PATH,
] as const;

/** Pages that show without the public site's navbar, footer and chat. */
export function isAppChromeFree(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  const under = (base: string) => pathname === base || pathname.startsWith(`${base}/`);
  return under("/auth") || under("/admin") || under("/dashboard") || ACCOUNT_PATHS.some(under);
}

function withRedirect(path: string, redirectTo?: string | null): string {
  const target = safeRedirectPath(redirectTo, "");
  return target ? `${path}?redirectTo=${encodeURIComponent(target)}` : path;
}

/** The login page, returning to `redirectTo` (a path on this site) afterwards. */
export const loginPath = (redirectTo?: string | null) => withRedirect(LOGIN_PATH, redirectTo);

/** The signup page, returning to `redirectTo` (a path on this site) once verified. */
export const signupPath = (redirectTo?: string | null) => withRedirect(SIGNUP_PATH, redirectTo);

export const verifyEmailPath = (email: string | null | undefined) =>
  `${VERIFY_EMAIL_PATH}?email=${encodeURIComponent(email ?? "")}`;
