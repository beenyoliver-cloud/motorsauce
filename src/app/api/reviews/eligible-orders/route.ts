// src/app/api/reviews/eligible-orders/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const supabase = supabaseServer();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get delivered orders for the current user (buyer)
    const { data: orders, error: orderErr } = await supabase
      .from("orders")
      .select("id, created_at")
      .eq("buyer_id", user.id)
      .eq("status", "delivered")
      .order("created_at", { ascending: false });

    if (orderErr) throw orderErr;

    if (!orders || orders.length === 0) {
      return NextResponse.json({ eligibleOrders: [] });
    }

    // Get order items for these orders
    const orderIds = orders.map((o: any) => o.id);
    const { data: orderItems, error: itemErr } = await supabase
      .from("order_items")
      .select("order_id, seller_id, title, image, seller_name")
      .in("order_id", orderIds);

    if (itemErr) throw itemErr;

    // Get any existing reviews for these orders
    const { data: existingReviews, error: reviewErr } = await supabase
      .from("business_reviews")
      .select("order_id")
      .eq("reviewer_profile_id", user.id)
      .in("order_id", orderIds);

    if (reviewErr) throw reviewErr;

    const reviewedOrderIds = new Set((existingReviews || []).map((r: any) => r.order_id));

    // Filter out orders that already have reviews
    const eligibleItems = (orderItems || []).filter(
      (item: any) => !reviewedOrderIds.has(item.order_id)
    );

    // Group by seller for the response
    const groupedBySeller: { [key: string]: any } = {};
    eligibleItems.forEach((item: any) => {
      if (!groupedBySeller[item.seller_id]) {
        groupedBySeller[item.seller_id] = {
          sellerId: item.seller_id,
          sellerName: item.seller_name,
          items: [],
        };
      }
      groupedBySeller[item.seller_id].items.push({
        orderId: item.order_id,
        title: item.title,
        image: item.image,
      });
    });

    return NextResponse.json({
      eligibleOrders: Object.values(groupedBySeller),
    });
  } catch (err: any) {
    console.error("[GET /api/reviews/eligible-orders]", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch eligible orders" },
      { status: 500 }
    );
  }
}
