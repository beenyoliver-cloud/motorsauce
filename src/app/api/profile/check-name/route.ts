import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;

// Helper to normalize display names (same as auth.ts)
function normalizeDisplayName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export async function POST(req: NextRequest) {
  try {
    const { displayName, currentUserId } = await req.json();

    if (!displayName || !currentUserId) {
      return NextResponse.json(
        { error: "displayName and currentUserId are required" },
        { status: 400 }
      );
    }

    if (!supabaseServiceKey) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Use service role to query all profiles
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Get all profiles to check for name uniqueness
    const { data: profiles, error: queryError } = await supabase
      .from("profiles")
      .select("id, name")
      .neq("id", currentUserId); // Exclude current user

    if (queryError) {
      console.error("[check-name] Query error:", queryError);
      return NextResponse.json(
        { error: "Failed to check name availability" },
        { status: 500 }
      );
    }

    // Normalize the requested name
    const normalizedRequested = normalizeDisplayName(displayName);

    // Check if any other user has this normalized name
    const isTaken = profiles?.some(
      (profile) => normalizeDisplayName(profile.name) === normalizedRequested
    );

    return NextResponse.json({
      available: !isTaken,
      displayName,
      message: isTaken
        ? "This display name is already taken. Please choose another."
        : "Display name is available",
    });
  } catch (error) {
    console.error("[check-name] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
