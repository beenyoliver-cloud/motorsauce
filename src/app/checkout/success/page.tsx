// src/app/checkout/success/page.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { clearCart } from "@/lib/cartStore";
import { addSoldIds } from "@/lib/soldStore";
import { formatGBP } from "@/lib/currency";
import { supabaseBrowser } from "@/lib/supabase";
// listings moved to Supabase; avoid synchronous local imports here

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

/** Try hard to get an image for the item */
function resolveImage(it: { id: string; image?: string; images?: string[] }): string {
  if (it.image) return it.image;
  if (it.images && it.images.length) return it.images[0];
  // synchronous DB lookups are not available here; fall back to placeholder
  return "/images/placeholder.png";
}

export default function CheckoutSuccessPage() {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);

  // Parse the serialized snapshot from the query string on the client.
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const payload = params.get("o");
      setSnapshot(payload ? (JSON.parse(decodeURIComponent(payload)) as Snapshot) : null);
    } catch {
      setSnapshot(null);
    }
  }, []);

  const orderRef = snapshot?.orderRef || "MS-ORDER";
  const committed = useRef(false);
  const [orderCreated, setOrderCreated] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  useEffect(() => {
    if (committed.current || !snapshot) return;
    committed.current = true;

    async function createOrder() {
      try {
        if (!snapshot) {
          console.error("No snapshot found");
          return;
        }

        const supabase = supabaseBrowser();
        const { data: session } = await supabase.auth.getSession();
        
        if (!session.session) {
          console.error("No session found, cannot create order");
          setOrderError("Authentication required");
          return;
        }

        // Create order in database via API
        const response = await fetch("/api/orders", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.session.access_token}`,
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
          const error = await response.json();
          throw new Error(error.error || "Failed to create order");
        }

        const { orderId, orderRef } = await response.json();
        console.log("Order created:", orderId, orderRef);
        
        // Mark sold & notify
        addSoldIds(snapshot.items.map((i) => i.id));
        setOrderCreated(true);
        
        // Clear cart
        clearCart();
      } catch (error) {
        console.error("Failed to create order:", error);
        setOrderError(error instanceof Error ? error.message : "Failed to create order");
        
        // Even if order creation fails, still clear cart to avoid duplicate orders
        clearCart();
      }
    }

    createOrder();
  }, [snapshot]);

  const items = snapshot?.items ?? [];
  const totals = snapshot?.totals ?? { itemsSubtotal: 0, shipping: 0, serviceFee: 0, total: 0 };

  return (
    <section className="mx-auto max-w-3xl px-4 py-6">
      {/* Top bar */}
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
        <h1 className="text-2xl font-extrabold text-gray-900">Order placed 🎉</h1>
        <p className="mt-2 text-gray-800">
          Reference: <span className="font-mono font-semibold">{orderRef}</span>
        </p>
        
        {/* Error message if order creation failed */}
        {orderError && (
          <div className="mt-4 rounded-md bg-yellow-50 border border-yellow-200 p-3 text-sm text-yellow-800">
            <p className="font-semibold">⚠️ Note:</p>
            <p className="mt-1">
              Your payment was successful, but there was an issue saving your order: {orderError}
            </p>
            <p className="mt-1">Please contact support with reference: {orderRef}</p>
          </div>
        )}
        
        <p className="mt-1 text-gray-600 text-sm">
          You'll receive a confirmation email shortly (MVP: not actually sent).
        </p>

        {/* Items recap */}
        {items.length > 0 && (
          <div className="mt-6 text-left">
            <h2 className="text-sm font-semibold text-gray-900 mb-2">What you ordered</h2>
            <ul className="divide-y divide-gray-100">
              {items.map((it) => {
                const img = resolveImage(it);
                return (
                  <li key={it.id} className="py-2 flex items-center gap-3">
                    <div className="h-14 w-16 rounded-md overflow-hidden border border-gray-200 bg-gray-50">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <Image src={img} alt={it.title} width={128} height={96} className="h-full w-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-gray-900 line-clamp-2">{it.title}</div>
                      <div className="text-[11px] text-gray-600">Qty {it.qty} • Seller {it.seller?.name}</div>
                    </div>
                    <div className="text-xs font-semibold text-gray-900 whitespace-nowrap">
                      {formatGBP(it.price * it.qty)}
                    </div>
                  </li>
                );
              })}
            </ul>

            {/* Totals */}
            <div className="mt-3 space-y-1 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-800">Items subtotal</span>
                <span className="text-gray-900 font-medium">{formatGBP(totals.itemsSubtotal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-800">Shipping</span>
                <span className="text-gray-900 font-medium">{formatGBP(totals.shipping)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-800">Service fee</span>
                <span className="text-gray-900 font-medium">{formatGBP(totals.serviceFee)}</span>
              </div>
              <div className="border-t border-gray-200 pt-2 flex items-center justify-between">
                <span className="font-semibold text-gray-900">Total</span>
                <span className="font-extrabold text-gray-900">{formatGBP(totals.total)}</span>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 flex items-center justify-center gap-3">
          <Link href="/orders" className="px-4 py-2 rounded-md border border-gray-300 hover:bg-gray-50 text-sm">
            View orders
          </Link>
          <Link
            href="/search"
            className="px-4 py-2 rounded-md bg-yellow-500 text-black font-semibold hover:bg-yellow-600 text-sm"
          >
            Continue shopping
          </Link>
        </div>
      </div>
    </section>
  );
}
