// src/app/api/watched-parts/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getSupabase(authHeader?: string | null) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  
  const client = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: authHeader ? { Authorization: authHeader } : {},
    },
  });
  
  return client;
}

// GET /api/watched-parts - Get all watched parts for current user with match counts
export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getSupabase(authHeader);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use the RPC function to get watched parts with match counts
    const { data: watches, error: watchesError } = await supabase
      .rpc("get_watched_parts_matches", { p_user_id: user.id });

    if (watchesError) {
      console.error("[watched-parts API] Error fetching watches:", watchesError);
      return NextResponse.json({ error: watchesError.message }, { status: 500 });
    }

    return NextResponse.json({ watches: watches || [] }, { status: 200 });
  } catch (error: any) {
    console.error("[watched-parts API] GET error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

// POST /api/watched-parts - Add a new watched part
export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getSupabase(authHeader);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { make, model, year } = body;

    if (!make || !model || !year) {
      return NextResponse.json(
        { error: "make, model, and year are required" },
        { status: 400 }
      );
    }

    // Validate year
    const yearNum = parseInt(year);
    if (isNaN(yearNum) || yearNum < 1900 || yearNum > new Date().getFullYear() + 2) {
      return NextResponse.json({ error: "Invalid year" }, { status: 400 });
    }

    // Insert new watch (will fail if duplicate due to unique constraint)
    const { data: watch, error: insertError } = await supabase
      .from("watched_parts")
      .insert({
        user_id: user.id,
        make: make.trim(),
        model: model.trim(),
        year: yearNum,
      })
      .select()
      .single();

    if (insertError) {
      if (insertError.code === "23505") { // Unique constraint violation
        return NextResponse.json({ error: "You're already watching this vehicle" }, { status: 409 });
      }
      console.error("[watched-parts API] Insert error:", insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ watch }, { status: 201 });
  } catch (error: any) {
    console.error("[watched-parts API] POST error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/watched-parts?id=xxx - Remove a watched part
export async function DELETE(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getSupabase(authHeader);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const watchId = searchParams.get("id");
    const make = searchParams.get("make");
    const model = searchParams.get("model");
    const year = searchParams.get("year");

    // Allow deletion by ID or by make/model/year
    let query = supabase
      .from("watched_parts")
      .delete()
      .eq("user_id", user.id);

    if (watchId) {
      query = query.eq("id", watchId);
    } else if (make && model && year) {
      query = query
        .eq("make", make.trim())
        .eq("model", model.trim())
        .eq("year", parseInt(year));
    } else {
      return NextResponse.json(
        { error: "Either id or make/model/year must be provided" },
        { status: 400 }
      );
    }

    const { error: deleteError } = await query;

    if (deleteError) {
      console.error("[watched-parts API] Delete error:", deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error("[watched-parts API] DELETE error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
