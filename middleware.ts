import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect /dashboard routes — require authenticated learner
  if (pathname.startsWith("/dashboard")) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          cookie: request.headers.get("cookie") ?? "",
        },
      },
    });

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      const loginUrl = new URL("/auth/login", request.url);
      loginUrl.searchParams.set("redirectTo", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Protect /admin routes — require admin secret cookie
  // But allow /admin/login itself to pass through
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const adminAuth = request.cookies.get("admin_auth")?.value;
    const adminSecret = process.env.ADMIN_SECRET;

    if (!adminAuth || adminAuth !== adminSecret) {
      const adminLoginUrl = new URL("/admin/login", request.url);
      return NextResponse.redirect(adminLoginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
