import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const publicRoutes = [
  '/',
  '/search',
  '/categories',
  '/listing',
  '/about',
  '/contact',
  '/terms',
  '/privacy',
  '/admin/debug',
  '/admin/status',
]

// Routes we explicitly allow auth pages for (left here for future expansion)
const authRoutes = ["/auth/login", "/auth/register", "/auth/logout", "/auth/callback"]; // eslint-disable-line @typescript-eslint/no-unused-vars

// In production, we can protect these paths via app-level checks instead of middleware to reduce edge runtime complexity
const protectedPatterns: string[] = [
  "/sell",
  "/basket",
  "/checkout",
  "/messages",
  "/orders",
  "/sales",
  "/profile/edit",
  "/admin",
];

export async function middleware(request: NextRequest) {
  try {
    const res = NextResponse.next();
    const path = request.nextUrl.pathname;

    // Skip static assets, image optimizer, and common meta files
    const isAsset =
      path.startsWith("/_next") ||
      path.startsWith("/favicon") ||
      path.startsWith("/robots") ||
      path.startsWith("/sitemap") ||
      path.startsWith("/images") ||
      path === "/favicon.ico";

    const isApi = path.startsWith("/api");
    const isAccessRoute = path === "/access" || path.startsWith("/api/access");
    const isAuthRoute = authRoutes.some((route) => path.startsWith(route));
    const isPublicRoute = publicRoutes.some((route) => path === route || path.startsWith(`${route}/`)); // eslint-disable-line @typescript-eslint/no-unused-vars

    // Password gate: if configured, require a cookie to proceed (do not apply to assets, API, or the access routes)
    const gateEnabled = Boolean(process.env.SITE_ACCESS_PASSWORD || process.env.NEXT_PUBLIC_SITE_ACCESS_PASSWORD);
    const hasGateCookie = request.cookies.get("site_access")?.value === "granted";
    if (gateEnabled && !hasGateCookie && !isAsset && !isApi && !isAccessRoute) {
      const url = new URL("/access", request.url);
      url.searchParams.set("next", path);
      return NextResponse.redirect(url);
    }

    // We intentionally avoid doing authentication checks in middleware to keep edge runtime minimal and robust.
    // App routes/pages can handle auth enforcement server-side or client-side as needed.
    if (isAuthRoute) return res;
    return res;
  } catch {
    // Never crash middleware: if anything goes wrong, allow request to proceed.
    return NextResponse.next();
  }
}

// Optionally restrict middleware to application paths only (skips assets by default here)
// Middleware is disabled because SITE_ACCESS_PASSWORD is not set
// If you want to re-enable the password gate, set SITE_ACCESS_PASSWORD env var and update the matcher
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|json)$).*)",
  ],
};