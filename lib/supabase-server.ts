import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { createAdminClient } from "./supabase";

// Server-side auth helpers for server components and route handlers. Only
// import this from server code — it reads request cookies.

// Cookie-scoped client acting as the signed-in user (RLS applies).
export async function createServerSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          // Server components can't set cookies; middleware refreshes the
          // session there, so ignoring the write is safe.
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );
}

// Verified with the auth server (getUser, not getSession). Errors map to null.
export async function getCurrentUser(): Promise<User | null> {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  } catch {
    return null;
  }
}

// Every account must have clicked an email verification link. Unverified
// users can still hold a session (e.g. one issued before verification was
// required), so this is checked on top of having a user at all.
export function isEmailVerified(user: Pick<User, "email_confirmed_at">): boolean {
  return !!user.email_confirmed_at;
}

function verifyEmailPath(user: User) {
  return `/auth/verify-email?email=${encodeURIComponent(user.email ?? "")}`;
}

export type Role = "student" | "instructor" | "admin";
export type StaffRole = Exclude<Role, "student">;

export async function getRole(userId: string): Promise<Role> {
  const { data } = await createAdminClient()
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();
  return data?.role === "admin" || data?.role === "instructor" ? data.role : "student";
}

export async function isAdmin(userId: string): Promise<boolean> {
  return (await getRole(userId)) === "admin";
}

// For server components: redirects instead of returning null.
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");
  if (!isEmailVerified(user)) redirect(verifyEmailPath(user));
  return user;
}

export async function requireAdmin(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login?redirectTo=/admin");
  if (!isEmailVerified(user)) redirect(verifyEmailPath(user));
  if (!(await isAdmin(user.id))) redirect("/dashboard");
  return user;
}

// Admins and instructors. Instructors only see their own cohorts; pages and
// routes that are admin-only still call requireAdmin / rejectNonAdmin.
export async function requireStaff(): Promise<{ user: User; role: StaffRole }> {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login?redirectTo=/admin");
  if (!isEmailVerified(user)) redirect(verifyEmailPath(user));
  const role = await getRole(user.id);
  if (role === "student") redirect("/dashboard");
  return { user, role };
}

// For route handlers: returns an error response to send back, or null when
// the caller is a signed-in, verified admin.
//   const denied = await rejectNonAdmin();
//   if (denied) return denied;
export async function rejectNonAdmin(): Promise<NextResponse | null> {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isEmailVerified(user) || !(await isAdmin(user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

// For learner route handlers: the verified user, or an error response.
export async function requireVerifiedUserApi(): Promise<
  { user: User; response?: never } | { user?: never; response: NextResponse }
> {
  const user = await getCurrentUser();
  if (!user) {
    return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (!isEmailVerified(user)) {
    return {
      response: NextResponse.json({ error: "Please verify your email address first." }, { status: 403 }),
    };
  }
  return { user };
}

// For staff route handlers: the verified admin or instructor, or an error response.
export async function requireStaffApi(): Promise<
  { user: User; role: StaffRole; response?: never } | { user?: never; role?: never; response: NextResponse }
> {
  const user = await getCurrentUser();
  if (!user) {
    return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const role = isEmailVerified(user) ? await getRole(user.id) : "student";
  if (role === "student") {
    return { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { user, role };
}
