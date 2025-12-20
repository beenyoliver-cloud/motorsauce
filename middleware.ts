import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const gatePassword =
  process.env.SITE_ACCESS_PASSWORD || process.env.NEXT_PUBLIC_SITE_ACCESS_PASSWORD || "";
const bypassPrefixes = ["/_next", "/images", "/favicon", "/robots.txt", "/sitemap"];

function isBypassedPath(pathname: string) {
  return bypassPrefixes.some((prefix) => pathname.startsWith(prefix));
}

export async function middleware(request: NextRequest) {
  if (!gatePassword) return NextResponse.next();

  const { pathname } = request.nextUrl;
  if (pathname === "/access" || pathname.startsWith("/api/access")) {
    return NextResponse.next();
  }
  if (isBypassedPath(pathname)) {
    return NextResponse.next();
  }

  const hasGateCookie = request.cookies.get("site_access")?.value === "granted";
  if (hasGateCookie) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Site locked" }, { status: 401 });
  }

  const url = new URL("/access", request.url);
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}
