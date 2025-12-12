import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Ensures the caller provides a valid admin API key via `x-admin-key` header.
 * Returns a NextResponse when the request should be rejected, otherwise null.
 */
export function requireAdminApiKey(request: Request | NextRequest) {
  const requiredKey = process.env.ADMIN_API_KEY;
  if (!requiredKey) {
    console.error("[adminApiKey] ADMIN_API_KEY environment variable is not configured");
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  const providedKey = request.headers.get("x-admin-key");
  if (!providedKey || providedKey !== requiredKey) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return null;
}
