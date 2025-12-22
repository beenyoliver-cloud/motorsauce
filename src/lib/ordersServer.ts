import { createClient } from "@supabase/supabase-js";
import { createNotificationServer } from "@/lib/notificationsServer";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;

export type ShippingAddress = {
  fullName: string;
  email: string;
  line1: string;
  line2?: string;
  city: string;
  postcode: string;
} | null;

export type OrderItemInput = {
  listing_id: string;
  seller_id?: string | null;
  seller_name?: string | null;
  title: string;
  image?: string | null;
  price: number;
  quantity: number;
};

export type OrderTotals = {
  itemsSubtotal: number;
  serviceFee: number;
  shippingCost: number;
  total: number;
};

type CreateOrderParams = {
  userId: string;
  items: OrderItemInput[];
  shippingMethod: "standard" | "collection";
  shippingAddress: ShippingAddress;
  totals: OrderTotals;
};

export async function createOrderRecord({
  userId,
  items,
  shippingMethod,
  shippingAddress,
  totals,
}: CreateOrderParams) {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase service role key is not configured");
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const normalizedItems = items.map((item) => ({
    ...item,
    seller_name: item.seller_name || "Unknown",
  }));

  const missingSeller = normalizedItems.filter((item) => !item.seller_id);
  if (missingSeller.length > 0) {
    const ids = missingSeller.map((item) => item.listing_id);
    const { data: listings, error } = await supabase
      .from("listings")
      .select("id, seller_id, owner_id")
      .in("id", ids);

    if (!error && listings) {
      const byId = new Map(listings.map((row) => [row.id, row]));
      for (const item of normalizedItems) {
        if (!item.seller_id) {
          const row = byId.get(item.listing_id);
          item.seller_id = row?.seller_id || row?.owner_id || null;
        }
      }
    }
  }

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      buyer_id: userId,
      items_subtotal: totals.itemsSubtotal,
      service_fee: totals.serviceFee,
      shipping_cost: totals.shippingCost,
      total: totals.total,
      shipping_method: shippingMethod,
      shipping_address: shippingAddress,
      status: "confirmed",
    })
    .select()
    .single();

  if (orderError || !order) {
    throw new Error(orderError?.message || "Failed to create order");
  }

  const orderItems = normalizedItems.map((item) => ({
    order_id: order.id,
    listing_id: item.listing_id,
    seller_id: item.seller_id,
    seller_name: item.seller_name || "Unknown",
    title: item.title,
    image: item.image || null,
    price: item.price,
    quantity: item.quantity,
  }));

  const { error: itemsError } = await supabase.from("order_items").insert(orderItems);
  if (itemsError) {
    await supabase.from("orders").delete().eq("id", order.id);
    throw new Error(itemsError.message || "Failed to create order items");
  }

  // Best-effort notification for the buyer. This should never block checkout.
  try {
    const firstTitle = normalizedItems[0]?.title || "your order";
    const more = normalizedItems.length > 1 ? ` (+${normalizedItems.length - 1} more)` : "";
    await createNotificationServer({
      userId,
      type: "order_confirmed",
      title: "Purchase confirmed",
      message: `You bought ${firstTitle}${more}.`,
      link: "/orders",
    });
  } catch {
    // ignore
  }

  // Best-effort notifications for sellers.
  // One notification per seller (aggregated message) to avoid spamming.
  try {
    const bySeller = new Map<string, { sellerName: string; items: string[]; totalQty: number }>();
    for (const item of normalizedItems) {
      const sellerId = item.seller_id;
      if (!sellerId) continue;
      const current = bySeller.get(sellerId) || {
        sellerName: item.seller_name || "",
        items: [],
        totalQty: 0,
      };
      current.items.push(item.title);
      current.totalQty += Math.max(1, Math.floor(Number(item.quantity || 1)));
      bySeller.set(sellerId, current);
    }

    for (const [sellerId, info] of bySeller.entries()) {
      const first = info.items[0] || "an item";
      const more = info.items.length > 1 ? ` (+${info.items.length - 1} more)` : "";

      await createNotificationServer({
        userId: sellerId,
        type: "item_sold",
        title: "Item sold",
        message: `You sold ${first}${more}.`,
        link: "/sales",
      });

      if (shippingMethod === "standard") {
        await createNotificationServer({
          userId: sellerId,
          type: "ship_item",
          title: "Ship your order",
          message: "The buyer chose shipping. Mark the order as shipped when you've sent it.",
          link: "/sales",
        });
      }
    }
  } catch {
    // ignore
  }

  return {
    orderId: order.id as string,
    orderRef: `MS-${String(order.id).split("-")[0].toUpperCase()}`,
  };
}
