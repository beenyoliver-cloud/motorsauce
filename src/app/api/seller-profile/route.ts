// API endpoint to fetch seller profile info including response time
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// Support multiple possible env var names for the service role key
const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE ||
  process.env.SUPABASE_SERVICE_KEY ||
  "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const name = searchParams.get("name");

    if (!name) {
      return NextResponse.json({ error: "Missing name parameter" }, { status: 400 });
    }

    const usingService = Boolean(serviceKey);
    if (!usingService) {
      console.warn("[seller-profile] Service role key missing. Falling back to anon key (RLS must allow public profile read)." );
    }

    const supabase = createClient(supabaseUrl, usingService ? serviceKey : anonKey);

    // Fetch profile with response metrics and account type
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("id, name, avatar, avg_response_time_minutes, response_rate, total_responses, total_inquiries_received, account_type")
      .eq("name", name)
      .single();

    if (error || !profile) {
      console.error("[seller-profile] Profile fetch error", { name, error });
      return NextResponse.json({ error: "Profile not found", code: "PROFILE_NOT_FOUND" }, { status: 404 });
    }

    return NextResponse.json({ ...profile, source: usingService ? "service" : "anon" });
  } catch (error) {
    console.error("[seller-profile] Unhandled error:", error);
    return NextResponse.json({ error: "Internal server error", code: "UNHANDLED" }, { status: 500 });
  }
}
