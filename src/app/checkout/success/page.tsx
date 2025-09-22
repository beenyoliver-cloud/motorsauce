// src/app/checkout/success/page.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { clearCart } from "@/lib/cartStore";
import { addSoldIds } from "@/lib/soldStore";
import { formatGBP } from "@/lib/currency";
import { listings } from "@/data/listings";

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

const ORDERS_KEY = "ms:orders:v1";

/** Try hard to get an image for the item */
function resolveImage(it: { id: string; image?: string; images?: string[] }): string {
  if (it.image) return it.image;
  if (it.images && it.images.length) return it.images[0];
  const match = listings.find((l) => l.id === it.id);
  if (!match) return "/images/placeholder.png";
  return (match.image as string) || (Array.isArray(match.images) ? match.images[0] : "") || "/images/placeholder.png";
}

export default function CheckoutSuccessPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const snapshot: Snapshot | null = useMemo(() => {
    try {
      const payload = sp.get("o");
      return payload ? (JSON.parse(decodeURIComponent(payload)) as Snapshot) : null;
    } catch {
      return null;
    }
  }, [sp]);

  const orderRef = snapshot?.orderRef || "MS-ORDER";
  const committed = useRef(false);

  useEffect(() => {
    if (committed.current) return;
    committed.current = true;

    try {
      if (snapshot) {
        const raw = localStorage.getItem(ORDERS_KEY);
        const orders = raw ? JSON.parse(raw) : [];
        const exists = Array.isArray(orders) && orders.some((o: any) => o?.orderRef === snapshot.orderRef);
        if (!exists) {
          orders.unshift({ id: snapshot.orderRef, ...snapshot });
          localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
        }
        // Mark sold & notify
        addSoldIds(snapshot.items.map((i) => i.id));
      }
    } catch {
      // ignore write errors
    }
    clearCart();
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
        <p className="mt-1 text-gray-600 text-sm">
          You’ll receive a confirmation email shortly (MVP: not actually sent).
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
