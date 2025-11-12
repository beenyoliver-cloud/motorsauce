import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const input = String(body?.password || "");

  const expected = process.env.SITE_ACCESS_PASSWORD || process.env.NEXT_PUBLIC_SITE_ACCESS_PASSWORD;
  if (!expected) {
    return NextResponse.json({ error: "Access gate not configured" }, { status: 500 });
  }

  if (input !== expected) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  // Set an httpOnly cookie for the gate
  res.cookies.set("site_access", "granted", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
  return res;
}
