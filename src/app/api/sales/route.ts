// src/app/api/sales/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const runtime = "nodejs";

// GET /api/sales - Get seller's sales (items they've sold)
export async function GET(req: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get authenticated user
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    
    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: "Invalid authentication" }, { status: 401 });
    }

    // Fetch order items where the seller is the current user
    // Join with orders to get buyer info and order status
    const { data: sales, error: salesError } = await supabase
      .from("order_items")
      .select(`
        *,
        order:orders!inner (
          id,
          buyer_id,
          status,
          shipping_method,
          created_at,
          cancelled_at,
          cancellation_reason,
          buyer:profiles!buyer_id (
            name,
            avatar
          )
        )
      `)
      .eq("seller_id", user.id)
      .order("created_at", { ascending: false });

    if (salesError) {
      console.error("[sales] Failed to fetch sales:", salesError);
      return NextResponse.json({ error: "Failed to fetch sales" }, { status: 500 });
    }

    // Transform the data to a more convenient format
    const formattedSales = (sales || []).map((item: any) => ({
      id: item.id,
      listing_id: item.listing_id,
      title: item.title,
      image: item.image,
      price: item.price,
      quantity: item.quantity,
      total: item.price * item.quantity,
      created_at: item.created_at,
      order_id: item.order.id,
      order_status: item.order.status,
      order_created_at: item.order.created_at,
      shipping_method: item.order.shipping_method,
      cancelled_at: item.order.cancelled_at,
      cancellation_reason: item.order.cancellation_reason,
      buyer_name: item.order.buyer?.name || "Unknown Buyer",
      buyer_avatar: item.order.buyer?.avatar || null,
    }));

    return NextResponse.json({ sales: formattedSales });
  } catch (error) {
    console.error("[sales] Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
