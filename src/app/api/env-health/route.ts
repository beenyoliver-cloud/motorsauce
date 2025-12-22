import { NextResponse } from "next/server";
import { requireAdminApiKey } from "../_lib/adminAuth";

export const dynamic = "force-dynamic";

/**
 * Returns ONLY booleans indicating whether required server secrets are configured.
 *
 * Protected by `x-admin-key` (see `requireAdminApiKey`) so we don't leak config state publicly.
 */
export async function GET(req: Request) {
  const gate = requireAdminApiKey(req);
  if (gate) return gate;

  const hasSupabaseUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const hasAnonKey = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const hasServiceRoleKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE);
  const hasStripeSecretKey = Boolean(process.env.STRIPE_SECRET_KEY);

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    env: {
      hasSupabaseUrl,
      hasAnonKey,
      hasServiceRoleKey,
      hasStripeSecretKey,
    },
  });
}
