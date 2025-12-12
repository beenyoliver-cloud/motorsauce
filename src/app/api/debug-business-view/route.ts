// Debug endpoint to check business_profiles_public view
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdminApiKey } from "../_lib/adminAuth";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(req: NextRequest) {
  const gate = requireAdminApiKey(req);
  if (gate) return gate;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    const supabase = createClient(supabaseUrl, serviceKey || anonKey);

    if (id) {
      const { data, error } = await supabase
        .from("business_profiles_public")
        .select("*")
        .eq("id", id)
        .single();

      return NextResponse.json({ data, error });
    }

    const { data, error } = await supabase
      .from("business_profiles_public")
      .select("*");

    return NextResponse.json({ data, error, count: data?.length || 0 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
