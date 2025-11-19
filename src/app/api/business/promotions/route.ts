import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get("business_id");
    const listingId = searchParams.get("listing_id");

    const supabase = await supabaseServer();

    let query = supabase
      .from("promoted_items")
      .select(`
        *,
        listings:listing_id (
          id,
          title,
          price,
          images
        )
      `)
      .eq("active", true);

    if (businessId) {
      query = query.eq("business_profile_id", businessId);
    }
    if (listingId) {
      query = query.eq("listing_id", listingId);
    }

    const { data, error } = await query.order("sort_order");

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error) {
    console.error("Get promotions error:", error);
    return NextResponse.json({ error: "Failed to fetch promotions" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await supabaseServer();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { listing_id, promotion_type, discount_percentage, promotion_text, sort_order } = body;

    if (!listing_id || !promotion_type) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("promoted_items")
      .insert({
        business_profile_id: user.id,
        listing_id,
        promotion_type,
        discount_percentage,
        promotion_text,
        sort_order: sort_order || 0,
        active: true,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error("Create promotion error:", error);
    return NextResponse.json({ error: "Failed to create promotion" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await supabaseServer();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const promotionId = searchParams.get("id");

    if (!promotionId) {
      return NextResponse.json({ error: "Promotion ID required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("promoted_items")
      .delete()
      .eq("id", promotionId)
      .eq("business_profile_id", user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete promotion error:", error);
    return NextResponse.json({ error: "Failed to delete promotion" }, { status: 500 });
  }
}
