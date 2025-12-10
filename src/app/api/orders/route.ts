// src/app/api/orders/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const runtime = "nodejs";

// POST /api/orders - Create a new order
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
   console.log("[orders] Received request body:", JSON.stringify(body, null, 2));
   
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
   
   console.log("[orders] Authenticated user:", user.id);

    // Create order record
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        buyer_id: user.id,
        items_subtotal: items_subtotal,
        service_fee: service_fee,
        shipping_cost: shipping_cost,
        total: total,
        shipping_method: shipping_method,
        shipping_address: shipping_address, // Add shipping address to database
        status: "confirmed",
      })
      .select()
      .single();

    if (orderError) {
     console.error("[orders] Failed to create order:", JSON.stringify(orderError, null, 2));
      return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
    }
   
   console.log("[orders] Order created:", order.id);

    // Ensure seller_id is present by backfilling from listings if needed
    const missingSeller = (items as any[]).filter((i) => !i.seller_id || String(i.seller_id).length === 0);
    if (missingSeller.length > 0) {
      const ids = missingSeller.map((i) => i.listing_id);
      const { data: listings, error: listingsErr } = await supabase
        .from("listings")
        .select("id, seller_id, owner_id")
        .in("id", ids);

      if (listingsErr) {
        console.error("[orders] Failed to fetch listings for seller backfill:", listingsErr);
      } else {
        const byId = new Map(listings.map((l: any) => [l.id, l]));
        for (const it of items as any[]) {
          if (!it.seller_id || String(it.seller_id).length === 0) {
            const row = byId.get(it.listing_id);
            it.seller_id = row?.seller_id || row?.owner_id || null;
          }
          if (!it.seller_name) it.seller_name = "Unknown";
        }
      }
    }

    // Create order items
    const orderItems = (items as any[]).map((item) => ({
      order_id: order.id,
      listing_id: item.listing_id,
      seller_id: item.seller_id, // after backfill
      seller_name: item.seller_name || "Unknown",
      title: item.title,
      image: item.image,
      price: item.price,
      quantity: item.quantity,
    }));
   
   console.log("[orders] Inserting order items:", JSON.stringify(orderItems, null, 2));

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(orderItems);

    if (itemsError) {
       console.error("[orders] Failed to create order items:", JSON.stringify(itemsError, null, 2));
      // Rollback: delete the order
      await supabase.from("orders").delete().eq("id", order.id);
       return NextResponse.json({ 
         error: "Failed to create order items",
         details: itemsError.message || itemsError 
       }, { status: 500 });
    }
   
     console.log("[orders] Order items created successfully");

    return NextResponse.json({
      success: true,
      orderId: order.id,
      orderRef: `MS-${order.id.split("-")[0].toUpperCase()}`,
    });
  } catch (error) {
     console.error("[orders] Unexpected error:", error);
     return NextResponse.json({ 
       error: "Internal server error",
       details: error instanceof Error ? error.message : String(error)
     }, { status: 500 });
  }
}

// GET /api/orders - Get user's orders
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
