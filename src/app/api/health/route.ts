import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdminApiKey } from "../_lib/adminAuth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const gate = requireAdminApiKey(req);
  if (gate) return gate;

  const envCheck = {
    supabaseConfigured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
  };

  let dbTest: { success: boolean; message: string } = { success: false, message: "not run" };
  if (envCheck.supabaseConfigured) {
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { auth: { persistSession: false } }
      );

      const { error } = await supabase
        .from("listings")
        .select("*", { count: "exact", head: true });

      dbTest = error
        ? { success: false, message: error.message || "query failed" }
        : { success: true, message: "ok" };
    } catch (err: any) {
      dbTest = { success: false, message: err?.message || "exception" };
    }
  } else {
    dbTest = { success: false, message: "supabase env vars missing" };
  }

  return NextResponse.json({
    status: dbTest.success ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    env: envCheck,
    database: dbTest,
  });
}
