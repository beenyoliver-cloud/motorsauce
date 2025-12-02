// src/app/orders/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { supabaseBrowser } from "@/lib/supabase";
import { formatGBP } from "@/lib/currency";
import { Package, X, MessageCircle, ArrowLeft } from "lucide-react";

type OrderItem = {
  id: string;
  listing_id: string;
  seller_id: string;
  seller_name: string;
  title: string;
  image: string | null;
  price: number;
  quantity: number;
};

type Order = {
  id: string;
  created_at: string;
  status: string;
  items_subtotal: number;
  service_fee: number;
  shipping_cost: number;
  total: number;
  shipping_method: string;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  order_items: OrderItem[];
};

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);

  useEffect(() => {
    loadOrders();
  }, []);

  async function loadOrders() {
    try {
      const user = await getCurrentUser();
      if (!user) {
        router.push("/auth/login?redirect=/orders");
        return;
      }

      const supabase = supabaseBrowser();
      const { data: session } = await supabase.auth.getSession();
      
      if (!session.session) {
        router.push("/auth/login?redirect=/orders");
        return;
      }

      const response = await fetch("/api/orders", {
        headers: {
          Authorization: `Bearer ${session.session.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders || []);
      } else if (response.status === 401) {
        router.push("/auth/login?redirect=/orders");
      }
    } catch (error) {
      console.error("Failed to load orders:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCancelOrder(orderId: string) {
    if (!confirm("Are you sure you want to cancel this order? This action cannot be undone.")) {
      return;
    }

    const reason = prompt("Please provide a reason for cancellation (optional):");
    
    try {
      setCancelling(orderId);
      const supabase = supabaseBrowser();
      const { data: session } = await supabase.auth.getSession();
      
      if (!session.session) {
        alert("Not authenticated");
        return;
      }

      const response = await fetch(`/api/orders/${orderId}/cancel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.session.access_token}`,
        },
        body: JSON.stringify({ reason }),
      });

      if (response.ok) {
        alert("Order cancelled successfully");
        loadOrders(); // Reload orders
      } else {
        const data = await response.json();
        alert(`Failed to cancel order: ${data.error}`);
      }
    } catch (error) {
      console.error("Failed to cancel order:", error);
      alert("An error occurred while cancelling the order");
    } finally {
      setCancelling(null);
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "shipped":
        return "bg-blue-100 text-blue-800";
      case "delivered":
        return "bg-purple-100 text-purple-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  }

  if (loading) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="text-center text-gray-600">Loading your orders...</div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-10">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-black"
        >
          <ArrowLeft size={20} />
          Back
        </button>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <Package size={28} />
          My Orders
        </h1>
      </div>

      {/* Orders List */}
      {orders.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
          <Package size={48} className="mx-auto mb-4 text-gray-400" />
          <h2 className="mb-2 text-lg font-semibold text-gray-900">No orders yet</h2>
          <p className="mb-4 text-sm text-gray-600">
            When you place an order, it will appear here.
          </p>
          <Link
            href="/"
            className="inline-block rounded-md bg-yellow-500 px-6 py-2 font-semibold text-black hover:bg-yellow-600"
          >
            Start Shopping
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => {
            const orderRef = `MS-${order.id.split("-")[0].toUpperCase()}`;
            const canCancel = order.status !== "cancelled" && order.status !== "delivered";

            return (
              <div key={order.id} className="rounded-lg border border-gray-200 bg-white p-6">
                {/* Order Header */}
                <div className="mb-4 flex flex-wrap items-start justify-between gap-4 border-b border-gray-200 pb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{orderRef}</h3>
                    <p className="text-sm text-gray-600">
                      Placed on {new Date(order.created_at).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusColor(order.status)}`}>
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </span>
                </div>

                {/* Order Items */}
                <div className="mb-4 space-y-3">
                  {order.order_items.map((item) => (
                    <div key={item.id} className="flex items-center gap-4">
                      <div className="h-16 w-20 flex-shrink-0 overflow-hidden rounded-md border border-gray-200 bg-gray-50">
                        <Image
                          src={item.image || "/images/placeholder.png"}
                          alt={item.title}
                          width={80}
                          height={64}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
                        <p className="text-xs text-gray-600">
                          Sold by {item.seller_name} • Qty: {item.quantity}
                        </p>
                      </div>
                      <div className="text-sm font-semibold text-gray-900">
                        {formatGBP(item.price * item.quantity)}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Order Total */}
                <div className="mb-4 space-y-1 border-t border-gray-200 pt-4 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Items Subtotal</span>
                    <span>{formatGBP(order.items_subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Service Fee</span>
                    <span>{formatGBP(order.service_fee)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Shipping ({order.shipping_method})</span>
                    <span>{formatGBP(order.shipping_cost)}</span>
                  </div>
                  <div className="flex justify-between text-base font-semibold text-gray-900 pt-2 border-t border-gray-200">
                    <span>Total</span>
                    <span>{formatGBP(order.total)}</span>
                  </div>
                </div>

                {/* Cancellation Info */}
                {order.status === "cancelled" && (
                  <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800">
                    <p className="font-semibold">Order Cancelled</p>
                    {order.cancellation_reason && (
                      <p className="mt-1">Reason: {order.cancellation_reason}</p>
                    )}
                    {order.cancelled_at && (
                      <p className="mt-1 text-xs text-red-600">
                        Cancelled on {new Date(order.cancelled_at).toLocaleDateString("en-GB")}
                      </p>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-3">
                  {canCancel && (
                    <button
                      onClick={() => handleCancelOrder(order.id)}
                      disabled={cancelling === order.id}
                      className="inline-flex items-center gap-2 rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <X size={16} />
                      {cancelling === order.id ? "Cancelling..." : "Cancel Order"}
                    </button>
                  )}
                  {order.order_items.length > 0 && (
                    <Link
                      href={`/messages?seller=${order.order_items[0].seller_id}`}
                      className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      <MessageCircle size={16} />
                      Contact Seller
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
