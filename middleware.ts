import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  // Middleware is completely disabled - just pass through all requests
  return NextResponse.next();
}

// Don't export config to let Next.js handle routing normally without middleware interference