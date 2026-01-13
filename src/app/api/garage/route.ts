// src/app/api/garage/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase environment variables");
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { searchParams } = new URL(req.url);
    const username = searchParams.get("username");

    if (!username) {
      return NextResponse.json({ error: "Username required" }, { status: 400 });
    }

    // Fetch public garage for the specified username
    const { data, error } = await supabase
      .from("public_garages")
      .select("cars, selected_car_id, is_public")
      .eq("username", username.toLowerCase())
      .eq("is_public", true)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // No rows found
        return NextResponse.json({ cars: [], selected_car_id: null, is_public: false }, { status: 200 });
      }
      throw error;
    }

    return NextResponse.json({
      cars: data.cars || [],
      selected_car_id: data.selected_car_id,
      is_public: data.is_public ?? false,
    });
  } catch (error) {
    console.error("Error fetching public garage:", error);
    return NextResponse.json({ error: "Failed to fetch garage" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase environment variables");
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get authorization header
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { cars, selected_car_id, is_public, username } = body;

    if (!username) {
      return NextResponse.json({ error: "Username required" }, { status: 400 });
    }

    // Upsert garage data
    const { error } = await supabase
      .from("public_garages")
      .upsert(
        {
          user_id: user.id,
          username: username.toLowerCase(),
          cars: cars || [],
          selected_car_id: selected_car_id || null,
          is_public: is_public ?? false,
        },
        {
          onConflict: "user_id",
        }
      );

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving garage:", error);
    return NextResponse.json({ error: "Failed to save garage" }, { status: 500 });
  }
}
