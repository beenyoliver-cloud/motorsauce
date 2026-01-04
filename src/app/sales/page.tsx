// src/app/sales/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { supabaseBrowser } from "@/lib/supabase";
import { formatGBP } from "@/lib/currency";
import { TrendingUp, MessageCircle, ArrowLeft, Package } from "lucide-react";

type Sale = {
  id: string;
  listing_id: string;
  title: string;
  image: string | null;
  price: number;
  quantity: number;
  total: number;
  created_at: string;
  order_id: string;
  order_status: string;
  order_created_at: string;
  shipping_method: string;
  shipped_at?: string | null;
  shipping_carrier?: string | null;
  tracking_number?: string | null;
  delivery_confirmed_at?: string | null;
  payout_status?: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  buyer_name: string;
  buyer_avatar: string | null;
};

export default function SalesPage() {
  const router = useRouter();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [shipping, setShipping] = useState<string | null>(null);

  useEffect(() => {
    loadSales();
  }, []);

  async function loadSales() {
    try {
      const user = await getCurrentUser();
      if (!user) {
        router.push("/auth/login?redirect=/sales");
        return;
      }

      const supabase = supabaseBrowser();
      const { data: session } = await supabase.auth.getSession();
      
      if (!session.session) {
        router.push("/auth/login?redirect=/sales");
        return;
      }

      const response = await fetch("/api/sales", {
        headers: {
          Authorization: `Bearer ${session.session.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSales(data.sales || []);
      } else if (response.status === 401) {
        router.push("/auth/login?redirect=/sales");
      }
    } catch (error) {
      console.error("Failed to load sales:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkShipped(orderId: string) {
    const carrier = prompt("Shipping carrier (optional):") || "";
    const tracking = prompt("Tracking number (optional):") || "";

    try {
      setShipping(orderId);
      const supabase = supabaseBrowser();
      const { data: session } = await supabase.auth.getSession();

      if (!session.session) {
        alert("Not authenticated");
        return;
      }

      const response = await fetch(`/api/orders/${orderId}/ship`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.session.access_token}`,
        },
        body: JSON.stringify({
          shipping_carrier: carrier || null,
          tracking_number: tracking || null,
        }),
      });

      if (response.ok) {
        loadSales();
      } else {
        const data = await response.json().catch(() => ({}));
        alert(`Failed to mark shipped: ${data.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Failed to mark shipped:", error);
      alert("An error occurred while marking shipped");
    } finally {
      setShipping(null);
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

  // Calculate statistics
  const stats = {
    totalSales: sales.length,
    activeSales: sales.filter(s => s.order_status !== "cancelled").length,
    cancelledSales: sales.filter(s => s.order_status === "cancelled").length,
    revenue: sales
      .filter(s => s.order_status !== "cancelled")
      .reduce((sum, s) => sum + s.total, 0),
  };

  if (loading) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="text-center text-gray-600">Loading your sales...</div>
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
          <TrendingUp size={28} />
          My Sales
        </h1>
      </div>

      {/* Statistics */}
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="text-sm text-gray-600">Total Sales</div>
          <div className="text-2xl font-bold text-gray-900">{stats.totalSales}</div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="text-sm text-gray-600">Active</div>
          <div className="text-2xl font-bold text-green-600">{stats.activeSales}</div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="text-sm text-gray-600">Cancelled</div>
          <div className="text-2xl font-bold text-red-600">{stats.cancelledSales}</div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="text-sm text-gray-600">Revenue</div>
          <div className="text-2xl font-bold text-gray-900">{formatGBP(stats.revenue)}</div>
        </div>
      </div>

      {/* Sales List */}
      {sales.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
          <Package size={48} className="mx-auto mb-4 text-gray-400" />
          <h2 className="mb-2 text-lg font-semibold text-gray-900">No sales yet</h2>
          <p className="mb-4 text-sm text-gray-600">
            When someone purchases your listing, it will appear here.
          </p>
          <Link
            href="/dashboard"
            className="inline-block rounded-md bg-yellow-500 px-6 py-2 font-semibold text-black hover:bg-yellow-600"
          >
            Go to Dashboard
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {sales.map((sale) => {
            const orderRef = `MS-${sale.order_id.split("-")[0].toUpperCase()}`;
            const isCancelled = sale.order_status === "cancelled";
            const canMarkShipped =
              !isCancelled && sale.order_status !== "delivered" && !sale.shipped_at;

            return (
              <div key={sale.id} className="rounded-lg border border-gray-200 bg-white p-6">
                {/* Sale Header */}
                <div className="mb-4 flex flex-wrap items-start justify-between gap-4 border-b border-gray-200 pb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Order {orderRef}
                    </h3>
                    <p className="text-sm text-gray-600">
                      Sold on {new Date(sale.order_created_at).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                    <p className="text-sm text-gray-600">
                      Buyer: {sale.buyer_name}
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusColor(sale.order_status)}`}>
                    {sale.order_status.charAt(0).toUpperCase() + sale.order_status.slice(1)}
                  </span>
                </div>

                {/* Sale Item */}
                <div className="mb-4 flex items-center gap-4">
                  <div className="h-20 w-24 flex-shrink-0 overflow-hidden rounded-md border border-gray-200 bg-gray-50">
                    <Image
                      src={sale.image || "/images/placeholder.png"}
                      alt={sale.title}
                      width={96}
                      height={80}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/listing/${sale.listing_id}`}
                      className="text-base font-medium text-gray-900 hover:underline line-clamp-2"
                    >
                      {sale.title}
                    </Link>
                    <p className="text-sm text-gray-600">
                      Quantity: {sale.quantity} • {formatGBP(sale.price)} each
                    </p>
                    <p className="text-sm text-gray-600">
                      Shipping: {sale.shipping_method === "standard" ? "Standard delivery" : "Collection"}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-gray-900">
                      {formatGBP(sale.total)}
                    </div>
                    {isCancelled && (
                      <div className="text-xs text-red-600">Cancelled</div>
                    )}
                  </div>
                </div>

                {/* Fulfillment / Payment holding */}
                <div className="mb-4 rounded-md border border-gray-200 bg-gray-50 p-3 text-sm text-gray-800">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-semibold">Delivery status</div>
                    <div className="text-xs text-gray-600">Funds release after buyer confirms delivery.</div>
                  </div>
                  <div className="mt-2 space-y-1 text-sm text-gray-700">
                    <div>
                      <span className="font-medium">Shipped:</span> {sale.shipped_at ? new Date(sale.shipped_at).toLocaleDateString("en-GB") : "Not yet"}
                    </div>
                    {(sale.shipping_carrier || sale.tracking_number) && (
                      <div className="text-xs text-gray-600">
                        {sale.shipping_carrier ? `${sale.shipping_carrier}` : ""}
                        {sale.shipping_carrier && sale.tracking_number ? " • " : ""}
                        {sale.tracking_number ? `Tracking: ${sale.tracking_number}` : ""}
                      </div>
                    )}
                    <div>
                      <span className="font-medium">Received:</span> {sale.delivery_confirmed_at ? new Date(sale.delivery_confirmed_at).toLocaleDateString("en-GB") : "Not yet"}
                    </div>
                    <div className="text-xs text-gray-600">
                      Payout status: {sale.payout_status || "held"}
                    </div>
                  </div>
                </div>

                {/* Cancellation Info */}
                {isCancelled && sale.cancellation_reason && (
                  <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800">
                    <p className="font-semibold">Order Cancelled</p>
                    <p className="mt-1">Reason: {sale.cancellation_reason}</p>
                    {sale.cancelled_at && (
                      <p className="mt-1 text-xs text-red-600">
                        Cancelled on {new Date(sale.cancelled_at).toLocaleDateString("en-GB")}
                      </p>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-3">
                  {canMarkShipped && (
                    <button
                      onClick={() => handleMarkShipped(sale.order_id)}
                      disabled={shipping === sale.order_id}
                      className="inline-flex items-center gap-2 rounded-md bg-yellow-500 px-4 py-2 text-sm font-semibold text-black hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {shipping === sale.order_id ? "Saving..." : "Mark shipped"}
                    </button>
                  )}
                  <Link
                    href="/messages"
                    className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    <MessageCircle size={16} />
                    Contact Buyer
                  </Link>
                  <Link
                    href={`/listing/${sale.listing_id}`}
                    className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    View Listing
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
