import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdminApiKey } from "../_lib/adminAuth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const gate = requireAdminApiKey(req);
  if (gate) return gate;

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Missing authorization header" }, { status: 401 });
    }

    const publicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const publicKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;

    if (!publicUrl || !publicKey) {
      return NextResponse.json({ error: "Supabase env vars missing" }, { status: 500 });
    }

    const supabase = createClient(publicUrl, publicKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized", details: authError?.message }, { status: 401 });
    }

    const response: any = {
      timestamp: new Date().toISOString(),
      user: { id: user.id, email: user.email },
      environment: {
        supabaseConfigured: true,
        serviceRoleConfigured: Boolean(serviceKey),
      },
    };

    if (serviceKey) {
      const serviceSupabase = createClient(publicUrl, serviceKey);
      const { data, error } = await serviceSupabase
        .from("admins")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();

      response.adminCheck = {
        method: "service_role",
        isAdmin: !!data,
        error: error?.message,
      };
    } else {
      const { data, error } = await supabase
        .from("admins")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();

      response.adminCheck = {
        method: "rls_fallback",
        isAdmin: !!data,
        error: error?.message,
      };
    }

    return NextResponse.json(response);
  } catch (error: any) {
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      error: error.message || "Unknown error",
    }, { status: 500 });
  }
}
