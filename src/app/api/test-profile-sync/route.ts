import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const username = searchParams.get("username") || "testuser";

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE ||
    process.env.SUPABASE_SERVICE_KEY ||
    "";

  if (!serviceKey) {
    return NextResponse.json(
      { error: "Service role key not configured" },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  // Get the profile from database
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, name, about, avatar, email")
    .eq("name", username)
    .single();

  if (error) {
    return NextResponse.json(
      {
        error: error.message,
        details: error,
        username,
      },
      { status: 400 }
    );
  }

  return NextResponse.json({
    success: true,
    profile,
    timestamp: new Date().toISOString(),
  });
}
