// src/app/api/orders/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createOrderRecord, type OrderItemInput, type OrderTotals, type ShippingAddress } from "@/lib/ordersServer";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;

export const runtime = "nodejs";

// POST /api/orders - Create a new order
export async function POST(req: NextRequest) {
  try {
    if (!supabaseServiceKey) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }
    const body = await req.json();
    const { 
      items, 
      shipping_method, 
      shipping_address,
      items_subtotal, 
      service_fee, 
      shipping_cost, 
      total 
    } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "No items provided" }, { status: 400 });
    }

    // Create Supabase client with service role for admin operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get authenticated user
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    
    if (!token) {
     console.error("[orders] No auth token provided");
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
     console.error("[orders] Auth error:", authError);
      return NextResponse.json({ error: "Invalid authentication" }, { status: 401 });
    }

    const orderPayload = {
      userId: user.id,
      items: (items as OrderItemInput[]).map((item) => ({
        listing_id: item.listing_id,
        seller_id: item.seller_id,
        seller_name: item.seller_name,
        title: item.title,
        image: item.image,
        price: item.price,
        quantity: item.quantity,
      })),
      shippingMethod: shipping_method as "standard" | "collection",
      shippingAddress: shipping_address as ShippingAddress,
      totals: {
        itemsSubtotal: items_subtotal,
        serviceFee: service_fee,
        shippingCost: shipping_cost,
        total,
      } as OrderTotals,
    };

    const { orderId, orderRef } = await createOrderRecord(orderPayload);

    return NextResponse.json({ success: true, orderId, orderRef });
  } catch (error) {
    console.error("[orders] Unexpected error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

// GET /api/orders - Get user's orders
export async function GET(req: NextRequest) {
  try {
    if (!supabaseServiceKey) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }
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

    // Fetch user's orders with items
    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select(`
        *,
        order_items (
          id,
          listing_id,
          seller_id,
          seller_name,
          title,
          image,
          price,
          quantity
        )
      `)
      .eq("buyer_id", user.id)
      .order("created_at", { ascending: false });

    if (ordersError) {
      console.error("[orders] Failed to fetch orders:", ordersError);
      return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
    }

    return NextResponse.json({ orders: orders || [] });
  } catch (error) {
    console.error("[orders] Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
