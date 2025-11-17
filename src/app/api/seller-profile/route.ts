// API endpoint to fetch seller profile info including response time
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const name = searchParams.get("name");

    if (!name) {
      return NextResponse.json({ error: "Missing name parameter" }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch profile with response metrics
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("id, name, avatar_url, avg_response_time_minutes, response_rate, total_responses, total_inquiries_received")
      .eq("name", name)
      .single();

    if (error || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    return NextResponse.json(profile);
  } catch (error) {
    console.error("GET /api/seller-profile error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
