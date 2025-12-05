import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Create client with auth token
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: { persistSession: false },
        global: { headers: { Authorization: authHeader } },
      }
    );

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check admin status using SERVICE ROLE (bypasses RLS)
    const serviceSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await serviceSupabase
      .from("admins")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      console.error("[is-admin API] Query error:", error);
      return NextResponse.json({ isAdmin: false });
    }

    return NextResponse.json({ isAdmin: !!data });
  } catch (error: any) {
    console.error("[is-admin API] Error:", error);
    return NextResponse.json({ isAdmin: false });
  }
}
