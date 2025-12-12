import { NextResponse } from "next/server";
import { requireAdminApiKey } from "../_lib/adminAuth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const gate = requireAdminApiKey(req);
  if (gate) return gate;

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    env: {
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV,
      supabaseConfigured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      serviceRoleConfigured: Boolean(process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY),
      listingsUseServiceRole: process.env.LISTINGS_USE_SERVICE_ROLE === "1",
    },
  });
}
