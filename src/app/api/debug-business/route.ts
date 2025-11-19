// Debug endpoint to check business account status
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET() {
  try {
    const supabase = createClient(supabaseUrl, serviceKey || anonKey);

    // Get all business accounts
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("id, name, email, account_type")
      .eq("account_type", "business");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get business_info for each
    const businessIds = profiles?.map(p => p.id) || [];
    const { data: businessInfo } = await supabase
      .from("business_info")
      .select("*")
      .in("profile_id", businessIds);

    return NextResponse.json({
      business_accounts: profiles,
      business_info: businessInfo,
      count: profiles?.length || 0
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
