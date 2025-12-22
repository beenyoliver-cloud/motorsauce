"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { clearCart } from "@/lib/cartStore";
import { addSoldIds } from "@/lib/soldStore";
import { formatGBP } from "@/lib/currency";
import { supabaseBrowser } from "@/lib/supabase";

type Snapshot = {
  orderRef: string;
  placedAt: string;
  items: Array<{
    id: string;
    title: string;
    image?: string;
    images?: string[];
    price: number;
    qty: number;
    seller: { name: string };
    sellerId?: string;
  }>;
  shipping: "standard" | "collection";
  address: {
    fullName: string;
    email: string;
    line1: string;
    line2?: string;
    city: string;
    postcode: string;
  };
  totals: { itemsSubtotal: number; serviceFee: number; shipping: number; total: number };
};

type OrderSummary = {
  orderRef: string;
  items: Array<{
    id: string;
    title: string;
    image?: string | null;
    price: number;
    qty: number;
    sellerName?: string | null;
  }>;
  totals: { itemsSubtotal: number; serviceFee: number; shipping: number; total: number };
  shippingMethod: "standard" | "collection";
  shippingAddress?: Snapshot["address"] | null;
};

function resolveImage(it: { image?: string | null; images?: string[]; id: string }): string {
  if (it.image) return it.image;
  if (it.images && it.images.length) return it.images[0];
  return "/images/placeholder.png";
}

export default function CheckoutSuccessPage() {
  const router = useRouter();
  const [order, setOrder] = useState<OrderSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => supabaseBrowser(), []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    const fallbackPayload = params.get("o");

    if (sessionId) {
      completeStripeOrder(sessionId);
    } else if (fallbackPayload) {
      try {
        const snapshot = JSON.parse(decodeURIComponent(fallbackPayload)) as Snapshot;
        createOrderFromSnapshot(snapshot);
      } catch (err) {
        console.error("Invalid snapshot payload", err);
        setError("We couldn't read your order details. Please contact support.");
        setLoading(false);
      }
    } else {
      setLoading(false);
      setError("Missing checkout confirmation. Please contact support if you were charged.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function ensureSession() {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) {
      throw new Error("Please sign in again to view your order.");
    }
    return session.session.access_token;
  }

  function toOrderSummary(data: any): OrderSummary {
    return {
      orderRef: data.orderRef,
      items: (data.items || []).map((item: any) => ({
        id: item.listing_id,
        title: item.title,
        image: item.image ?? null,
        price: item.price,
        qty: item.quantity,
        sellerName: item.seller_name,
      })),
      totals: {
        itemsSubtotal: data.totals?.itemsSubtotal ?? 0,
        serviceFee: data.totals?.serviceFee ?? 0,
        shipping: data.totals?.shippingCost ?? 0,
        total: data.totals?.total ?? 0,
      },
      shippingMethod: data.shippingMethod || "standard",
      // shippingAddress may be omitted by the lookup endpoint for privacy.
      shippingAddress: data.shippingAddress || null,
    };
  }

  async function completeWithoutSession(sessionId: string) {
    const res = await fetch(`/api/checkout/lookup?session_id=${encodeURIComponent(sessionId)}`, {
      method: "GET",
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Failed to confirm payment (${res.status})`);
    }

    const data = await res.json();
    const summary = toOrderSummary(data);
    addSoldIds(summary.items.map((item) => item.id));
    clearCart();
    setOrder(summary);
    setError(null);
  }

  async function completeStripeOrder(sessionId: string) {
    setLoading(true);
    try {
      // 1) Prefer the new session-based path (works even if the browser appears signed out after redirect).
      await completeWithoutSession(sessionId);

      // 2) If you are signed in, also call the authenticated completion endpoint so it can
      //    enforce user ownership and return shipping address. Fail-open.
      try {
        const token = await ensureSession();
        const res = await fetch("/api/checkout/complete", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ session_id: sessionId }),
        });

        if (res.ok) {
          const data = await res.json();
          const summary = toOrderSummary(data);
          setOrder(summary);
        }
      } catch (e) {
        // ignore
      }
    } catch (err: any) {
      console.error("Failed to complete Stripe session", err);
      setError(err instanceof Error ? err.message : "Failed to confirm your payment.");
    } finally {
      setLoading(false);
    }
  }

  async function createOrderFromSnapshot(snapshot: Snapshot) {
    setLoading(true);
    try {
      const token = await ensureSession();
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          items: snapshot.items.map((item) => ({
            listing_id: item.id,
            seller_id: item.sellerId || "",
            seller_name: item.seller?.name || "Unknown",
            title: item.title,
            image: resolveImage(item),
            price: item.price,
            quantity: item.qty,
          })),
          shipping_method: snapshot.shipping,
          shipping_address: snapshot.address,
          items_subtotal: snapshot.totals.itemsSubtotal,
          service_fee: snapshot.totals.serviceFee,
          shipping_cost: snapshot.totals.shipping,
          total: snapshot.totals.total,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || "Failed to create order");
      }

      const { orderRef } = await response.json();
      addSoldIds(snapshot.items.map((i) => i.id));
      clearCart();
      setOrder({
        orderRef,
        items: snapshot.items.map((item) => ({
          id: item.id,
          title: item.title,
          image: resolveImage(item),
          price: item.price,
          qty: item.qty,
          sellerName: item.seller?.name ?? "Seller",
        })),
        totals: {
          itemsSubtotal: snapshot.totals.itemsSubtotal,
          serviceFee: snapshot.totals.serviceFee,
          shipping: snapshot.totals.shipping,
          total: snapshot.totals.total,
        },
        shippingMethod: snapshot.shipping,
        shippingAddress: snapshot.address,
      });
      setError(null);
    } catch (err: any) {
      console.error("Failed to create order from snapshot", err);
      setError(err instanceof Error ? err.message : "Failed to save your order.");
    } finally {
      setLoading(false);
    }
  }

  const orderRef = order?.orderRef || "MS-ORDER";
  const items = order?.items ?? [];
  const totals = order?.totals ?? { itemsSubtotal: 0, shipping: 0, serviceFee: 0, total: 0 };

  return (
    <section className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-4">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-800 hover:text-black"
          aria-label="Go back"
        >
          <span className="text-lg">←</span> Back
        </button>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 md:p-10 text-center">
        <h1 className="text-2xl font-extrabold text-gray-900">Order placed</h1>
        <p className="mt-2 text-gray-800">
          Reference: <span className="font-mono font-semibold">{orderRef}</span>
        </p>

        {error && (
          <div className="mt-4 rounded-md bg-yellow-50 border border-yellow-200 p-3 text-sm text-yellow-800 text-left">
            <p className="font-semibold">Heads up:</p>
            <p className="mt-1">{error}</p>
            <p className="mt-1">
              Please contact support with reference <span className="font-mono">{orderRef}</span> if you were
              charged.
            </p>
          </div>
        )}

        {!error && (
          <p className="mt-1 text-gray-600 text-sm">
            You&apos;ll receive a confirmation email shortly (MVP: not actually sent).
          </p>
        )}

        {items.length > 0 && (
          <div className="mt-6 text-left">
            <h2 className="text-sm font-semibold text-gray-900 mb-2">What you ordered</h2>
            <ul className="divide-y divide-gray-100">
              {items.map((it) => (
                <li key={it.id} className="py-2 flex items-center gap-3">
                  <div className="h-14 w-16 rounded-md overflow-hidden border border-gray-200 bg-gray-50">
                    <Image src={resolveImage(it)} alt={it.title} width={128} height={96} className="h-full w-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-gray-900 line-clamp-2">{it.title}</div>
                    <div className="text-[11px] text-gray-600">
                      Qty {it.qty} • Seller {it.sellerName || "Seller"}
                    </div>
                  </div>
                  <div className="text-xs font-semibold text-gray-900 whitespace-nowrap">
                    {formatGBP(it.price * it.qty)}
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-4 border-t border-gray-100 pt-3 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Items</span>
                <span className="font-semibold text-gray-900">{formatGBP(totals.itemsSubtotal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Shipping</span>
                <span className="font-semibold text-gray-900">{formatGBP(totals.shipping)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Service fee</span>
                <span className="font-semibold text-gray-900">{formatGBP(totals.serviceFee)}</span>
              </div>
              <div className="flex items-center justify-between text-base border-t border-gray-200 pt-2">
                <span className="font-semibold text-gray-900">Total</span>
                <span className="font-extrabold text-gray-900">{formatGBP(totals.total)}</span>
              </div>
            </div>
          </div>
        )}

        {loading && !items.length && (
          <div className="mt-6 text-sm text-gray-600">Finalising your order…</div>
        )}

        <div className="mt-8 text-sm text-gray-600">
          Need help? <Link href="/contact" className="text-yellow-600 hover:underline">Contact support</Link>.
        </div>
      </div>
    </section>
  );
}
