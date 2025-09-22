// src/app/orders/page.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { getCurrentUser } from "@/lib/auth";
import { formatGBP } from "@/lib/currency";

type OrderItem = {
  id: string;
  title: string;
  image: string;
  price: number; // numeric GBP
  qty: number;
  seller: { name: string };
};

type Order = {
  id: string;              // orderRef
  orderRef: string;
  placedAt: string;        // ISO
  items: OrderItem[];
  shipping: "standard" | "collection";
  address: { fullName: string; email: string; line1: string; line2?: string; city: string; postcode: string };
  totals: { itemsSubtotal: number; serviceFee: number; shipping: number; total: number };
};

const KEY = "ms:orders:v1";

export default function OrdersPage() {
  const me = getCurrentUser();
  const myName = (me?.name || "You").trim();
  const [orders, setOrders] = useState<Order[]>([]);

  // Load on mount and whenever storage changes (e.g., other tab)
  useEffect(() => {
    const read = () => {
      try {
        const raw = localStorage.getItem(KEY);
        setOrders(raw ? JSON.parse(raw) : []);
      } catch {
        setOrders([]);
      }
    };
    read();
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) read();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const stats = useMemo(() => {
    // Classify: if ANY item seller === me => treat as a sale (MVP heuristic).
    const isSold = (o: Order) => o.items.some((it) => it.seller?.name?.trim().toLowerCase() === myName.toLowerCase());

    const soldOrders = orders.filter(isSold);
    const boughtOrders = orders.filter((o) => !isSold(o));

    // MVP finance assumptions:
    // - For BOUGHT: money out = totals.total (items + fee + shipping)
    // - For SOLD: revenue = itemsSubtotal (ignoring marketplace fees/payouts for now)
    const spend = boughtOrders.reduce((s, o) => s + (o.totals?.total || 0), 0);
    const revenue = soldOrders.reduce((s, o) => s + (o.totals?.itemsSubtotal || 0), 0);
    const net = revenue - spend;

    return {
      total: orders.length,
      boughtCount: boughtOrders.length,
      soldCount: soldOrders.length,
      spend,
      revenue,
      net,
    };
  }, [orders, myName]);

  return (
    <section className="max-w-6xl mx-auto px-4 py-6">
      {/* Analytics Bar */}
      <div className="sticky top-[65px] z-20 -mx-4 px-4 py-3 mb-6 bg-white/90 backdrop-blur border-b border-gray-200">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat title="Orders" value={String(stats.total)} />
          <Stat title="Bought" value={String(stats.boughtCount)} />
          <Stat title="Sold" value={String(stats.soldCount)} />
          <Stat
            title="Net Profit/Loss"
            value={(stats.net >= 0 ? "+" : "−") + formatGBP(Math.abs(stats.net))}
            emphasis={stats.net >= 0 ? "pos" : stats.net < 0 ? "neg" : "neutral"}
            sub={`${formatGBP(stats.revenue)} revenue • ${formatGBP(stats.spend)} spend`}
          />
        </div>
      </div>

      <h1 className="text-2xl font-bold mb-4">My Orders</h1>

      {orders.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="space-y-4">
          {orders.map((o) => (
            <li key={o.id} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <header className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-gray-200">
                <div className="text-sm">
                  <div className="font-semibold text-black">
                    Order <span className="font-mono">{o.orderRef}</span>
                  </div>
                  <div className="text-gray-600">
                    Placed {new Date(o.placedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                  </div>
                </div>
                <div className="text-right text-sm">
                  <div className="font-bold">{formatGBP(o.totals.total)}</div>
                  <div className="text-gray-600">
                    {o.shipping === "standard" ? "Standard delivery" : "Free collection"}
                  </div>
                </div>
              </header>

              {/* Items */}
              <div className="divide-y divide-gray-100">
                {o.items.map((it) => (
                  <div key={it.id} className="p-4 flex items-center gap-4">
                    <div className="h-16 w-20 rounded-md overflow-hidden border border-gray-200 bg-gray-50">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <Image src={it.image} alt={it.title} width={160} height={120} className="h-full w-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/listing/${encodeURIComponent(it.id)}`}
                        className="text-sm font-semibold text-black hover:underline line-clamp-1"
                      >
                        {it.title}
                      </Link>
                      <div className="text-xs text-gray-600 mt-0.5">
                        Seller: <Link href={`/profile/${encodeURIComponent(it.seller?.name || "")}`} className="hover:underline">
                          {it.seller?.name || "Seller"}
                        </Link>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold">{formatGBP(it.price)}</div>
                      <div className="text-xs text-gray-600">Qty {it.qty}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <footer className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-gray-700">
                    Subtotal {formatGBP(o.totals.itemsSubtotal)} • Service fee {formatGBP(o.totals.serviceFee)} • Shipping {formatGBP(o.totals.shipping)}
                  </div>
                  <div className="font-extrabold">{formatGBP(o.totals.total)}</div>
                </div>
              </footer>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* --------------------------- Components --------------------------- */

function EmptyState() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
      <p className="text-gray-700">You don’t have any orders yet.</p>
      <div className="mt-4">
        <Link
          href="/search"
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-md bg-yellow-500 text-black font-semibold hover:bg-yellow-600"
        >
          Start shopping
        </Link>
      </div>
    </div>
  );
}

function Stat({
  title,
  value,
  sub,
  emphasis = "neutral",
}: {
  title: string;
  value: string;
  sub?: string;
  emphasis?: "pos" | "neg" | "neutral";
}) {
  const color =
    emphasis === "pos" ? "text-emerald-700" : emphasis === "neg" ? "text-rose-700" : "text-gray-900";
  const chip =
    emphasis === "pos"
      ? "bg-emerald-50 border-emerald-200"
      : emphasis === "neg"
      ? "bg-rose-50 border-rose-200"
      : "bg-gray-50 border-gray-200";
  return (
    <div className={`rounded-lg border ${chip} p-3`}>
      <div className="text-[11px] uppercase tracking-wide text-gray-600">{title}</div>
      <div className={`text-lg font-extrabold ${color}`}>{value}</div>
      {sub && <div className="text-xs text-gray-600 mt-0.5">{sub}</div>}
    </div>
  );
}
