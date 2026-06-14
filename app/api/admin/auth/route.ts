import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  const adminSecret = process.env.ADMIN_SECRET;

  if (!adminSecret || password !== adminSecret) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set("admin_auth", adminSecret, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 8, // 8 hours
    path: "/",
  });

  return response;
}
