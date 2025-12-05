// src/app/api/reviews/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const supabase = supabaseServer();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type"); // "received" or "left"

    if (type === "received") {
      // Reviews received by current user (they are the seller/business)
      const { data, error } = await supabase
        .from("business_reviews")
        .select("*")
        .eq("business_profile_id", user.id)
        .eq("admin_approved", true)
        .eq("flagged", false)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return NextResponse.json({ reviews: data || [] });
    } else if (type === "left") {
      // Reviews left by current user (they are the reviewer)
      const { data, error } = await supabase
        .from("business_reviews")
        .select("*")
        .eq("reviewer_profile_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return NextResponse.json({ reviews: data || [] });
    } else {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }
  } catch (err: any) {
    console.error("[GET /api/reviews]", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch reviews" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = supabaseServer();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      businessProfileId,
      rating,
      title,
      reviewText,
      orderId,
    } = body;

    if (!businessProfileId || !rating) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Verify the reviewer actually has an order from this seller
    let verifiedPurchase = false;
    if (orderId) {
      const { data: orderItem } = await supabase
        .from("order_items")
        .select("id")
        .eq("order_id", orderId)
        .eq("seller_id", businessProfileId)
        .single();

      if (orderItem) {
        verifiedPurchase = true;
      }
    } else {
      // Check if any order exists from reviewer to business
      const { data: orderItems } = await supabase
        .from("order_items")
        .select("order_id")
        .eq("seller_id", businessProfileId);

      const { data: orders } = await supabase
        .from("orders")
        .select("id")
        .eq("buyer_id", user.id)
        .in("id", (orderItems || []).map((oi: any) => oi.order_id));

      verifiedPurchase = (orders || []).length > 0;
    }

    if (!verifiedPurchase) {
      return NextResponse.json(
        { error: "You can only review sellers you've purchased from" },
        { status: 403 }
      );
    }

    // Create the review
    const { data, error } = await supabase
      .from("business_reviews")
      .insert([
        {
          business_profile_id: businessProfileId,
          reviewer_profile_id: user.id,
          rating,
          title,
          review_text: reviewText,
          order_id: orderId,
          verified_purchase: true,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ review: data });
  } catch (err: any) {
    console.error("[POST /api/reviews]", err);
    return NextResponse.json(
      { error: err.message || "Failed to create review" },
      { status: 500 }
    );
  }
}
