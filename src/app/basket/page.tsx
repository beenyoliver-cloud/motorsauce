"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Cart,
  CartItem,
  calcTotals,
  getCart,
  removeFromCart,
  setShipping,
  updateQty,
} from "@/lib/cartStore";
import { formatGBP } from "@/lib/currency";
import { resolveListingImage } from "@/lib/image";

export default function BasketPage() {
  const router = useRouter();
  const [cart, setCart] = useState<Cart>(getCart());

  useEffect(() => {
    const onChange = () => setCart(getCart());
    window.addEventListener("ms:cart", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("ms:cart", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const totals = useMemo(() => calcTotals(cart), [cart]);
  const isEmpty = cart.items.length === 0;

  return (
    <section className="mx-auto max-w-6xl px-4 py-6">
      {/* Top bar */}
      <div className="mb-4 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-800 hover:text-black"
          aria-label="Go back"
        >
          <span className="text-lg">←</span> Back
        </button>
        <h1 className="text-2xl font-extrabold text-gray-900">Your basket</h1>
      </div>
      <p className="text-gray-700 mb-6">Review items and proceed to checkout.</p>

      {isEmpty ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
          <p className="text-gray-900 mb-4">Your basket is empty.</p>
          <Link
            href="/search"
            className="inline-flex px-4 py-2 rounded-md bg-yellow-500 text-black font-semibold hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-400"
          >
            Start shopping
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Items */}
          <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white">
            <ul role="list" className="divide-y divide-gray-100">
              {cart.items.map((i) => (
                <BasketRow key={i.id} item={i} />
              ))}
            </ul>

            <div className="flex items-center justify-between p-4">
              <button
                onClick={() => {
                  for (const i of cart.items) removeFromCart(i.id);
                }}
                className="text-sm text-gray-900 hover:text-black underline"
              >
                Remove all items
              </button>
              <Link href="/search" className="text-sm text-gray-900 hover:text-black underline">
                Continue shopping
              </Link>
            </div>
          </div>

          {/* Summary */}
          <aside className="rounded-xl border border-gray-200 bg-white p-4 lg:sticky lg:top-[72px] h-fit">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Summary</h2>

            <div className="space-y-3 text-sm">
              <Row label="Items subtotal" value={formatGBP(totals.itemsSubtotal)} />

              <div className="flex items-start justify-between">
                <div>
                  <div className="text-gray-900">Shipping</div>
                  <select
                    className="mt-1 text-sm border border-gray-300 rounded-md px-2 py-1 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    value={cart.shipping}
                    onChange={(e) => setShipping(e.target.value as "standard" | "collection")}
                    aria-label="Select shipping method"
                  >
                    <option value="standard">Standard (2–4 days)</option>
                    <option value="collection">Free collection</option>
                  </select>
                </div>
                <div className="text-right text-gray-900 font-medium">
                  {formatGBP(totals.shipping)}
                </div>
              </div>

              <Row label="Service fee" value={formatGBP(totals.serviceFee)} />

              <div className="border-t border-gray-200 pt-3 flex items-center justify-between">
                <span className="font-semibold text-gray-900">Total</span>
                <span className="font-extrabold text-gray-900">{formatGBP(totals.total)}</span>
              </div>
            </div>

            <Link
              href="/checkout"
              className="mt-4 block w-full text-center px-4 py-2 rounded-md bg-yellow-500 text-black font-semibold hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-400"
            >
              Go to checkout
            </Link>

            <p className="mt-2 text-xs text-gray-700">You won’t be charged yet. Taxes are included where applicable.</p>
          </aside>
        </div>
      )}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-900">{label}</span>
      <span className="text-gray-900 font-medium">{value}</span>
    </div>
  );
}

function BasketRow({ item }: { item: CartItem }) {
  const [qty, setQty] = useState(item.qty);
  useEffect(() => setQty(item.qty), [item.qty]);

  const img = resolveListingImage({ image: item.image, images: undefined, listingImage: undefined });

  return (
    <li className="p-4 flex gap-4 items-center">
      <div className="h-20 w-24 flex-shrink-0 overflow-hidden rounded-md border border-gray-200 bg-gray-50">
        <Image src={img} alt={item.title} width={160} height={120} className="h-full w-full object-cover" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-gray-900 line-clamp-2">{item.title}</div>
            <div className="text-xs text-gray-800 mt-0.5">Seller: {item.seller.name}</div>
          </div>
          <div className="text-sm font-semibold text-gray-900">{formatGBP(item.price)}</div>
        </div>

        {/* Quantity controls */}
        <div className="mt-3 flex items-center gap-2">
          <span className="text-xs text-gray-900">Qty</span>
          <div className="inline-flex items-stretch rounded-md border border-gray-300 overflow-hidden">
            <button
              type="button"
              onClick={() => {
                const next = Math.max(1, qty - 1);
                setQty(next);
                updateQty(item.id, next);
              }}
              className="px-2 text-sm text-gray-900 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              aria-label="Decrease quantity"
            >
              −
            </button>
            <input
              type="number"
              min={1}
              max={99}
              value={qty}
              onChange={(e) =>
                setQty(Math.max(1, Math.min(99, parseInt(e.target.value || "1", 10))))
              }
              onBlur={() => updateQty(item.id, qty)}
              className="w-14 text-center text-sm text-gray-900 bg-white px-2 py-1 focus:outline-none"
              aria-label="Quantity"
            />
            <button
              type="button"
              onClick={() => {
                const next = Math.min(99, qty + 1);
                setQty(next);
                updateQty(item.id, next);
              }}
              className="px-2 text-sm text-gray-900 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>

          <button
            onClick={() => removeFromCart(item.id)}
            className="ml-auto text-xs text-gray-900 hover:text-black underline"
          >
            Remove
          </button>
        </div>
      </div>
    </li>
  );
}
