import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const publicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const publicKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;

    const response: any = {
      timestamp: new Date().toISOString(),
      environment: {
        hasPublicUrl: !!publicUrl,
        hasPublicKey: !!publicKey,
        hasServiceKey: !!serviceKey,
      },
      request: {
        hasAuthHeader: !!authHeader,
      },
    };

    // If no auth header, return basic info
    if (!authHeader) {
      response.error = "No authorization header";
      return NextResponse.json(response);
    }

    // Create client with auth token
    const supabase = createClient(publicUrl!, publicKey!, {
      auth: { persistSession: false },
      global: { headers: { Authorization: authHeader } },
    });

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    response.user = {
      id: user?.id,
      email: user?.email,
      error: authError?.message,
    };

    if (!user) {
      response.error = "Could not get user from token";
      return NextResponse.json(response);
    }

    // Check admin status with service role
    if (serviceKey) {
      const serviceSupabase = createClient(publicUrl!, serviceKey);
      const { data, error } = await serviceSupabase
        .from("admins")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();

      response.adminCheck = {
        method: "service_role",
        success: !error,
        isAdmin: !!data,
        error: error?.message,
      };
    } else {
      // Try with RLS
      const { data, error } = await supabase
        .from("admins")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();

      response.adminCheck = {
        method: "rls_fallback",
        success: !error,
        isAdmin: !!data,
        error: error?.message,
      };
    }

    return NextResponse.json(response);
  } catch (error: any) {
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      error: error.message || "Unknown error",
      stack: error.stack,
    });
  }
}
