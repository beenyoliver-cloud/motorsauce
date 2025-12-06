// src/components/CartDrawer.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { Cart, CartItem, calcTotals, getCart, removeFromCart, updateQty } from "@/lib/cartStore";
import { formatGBP } from "@/lib/currency";
import { resolveListingImage } from "@/lib/image";

export default function CartDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [cart, setCart] = useState<Cart>(getCart());

  useEffect(() => {
    const refresh = () => setCart(getCart());
    window.addEventListener("ms:cart", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("ms:cart", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const totals = useMemo(() => calcTotals(cart), [cart]);

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/30 transition-opacity z-[80] ${open ? "opacity-100 visible" : "opacity-0 invisible pointer-events-none"}`}
        onClick={onClose}
        onTouchEnd={onClose}
      />
      <aside
        className={`fixed top-0 right-0 h-full w-[360px] max-w-[90vw] bg-white shadow-2xl border-l border-gray-200
                    transition-transform duration-300 z-[90] ${open ? "translate-x-0" : "translate-x-full"}`}
        aria-hidden={!open}
        aria-label="Mini cart"
      >
        <header className="h-14 px-4 flex items-center justify-between border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-900">Your basket</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100" aria-label="Close cart">
            <X size={18} />
          </button>
        </header>

        <div className="h-[calc(100%-56px)] flex flex-col">
          <div className="flex-1 overflow-auto">
            {cart.items.length === 0 ? (
              <div className="p-6 text-center text-gray-800">
                Your basket is empty.
                <div className="mt-3">
                  <Link href="/search" onClick={onClose} className="text-sm underline">
                    Start shopping
                  </Link>
                </div>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {cart.items.map((it) => (
                  <Row key={it.id} item={it} />
                ))}
              </ul>
            )}
          </div>

          <footer className="border-t border-gray-200 p-4">
            {cart.items.length > 0 && (
              <>
                <div className="mb-2 text-sm flex items-center justify-between">
                  <span className="text-gray-900">Items</span>
                  <span className="text-gray-900 font-medium">{formatGBP(totals.itemsSubtotal)}</span>
                </div>
                <div className="mb-2 text-sm flex items-center justify-between">
                  <span className="text-gray-900">Shipping</span>
                  <span className="text-gray-900 font-medium">{formatGBP(totals.shipping)}</span>
                </div>
                <div className="mb-3 text-sm flex items-center justify-between">
                  <span className="text-gray-900">Service fee</span>
                  <span className="text-gray-900 font-medium">{formatGBP(totals.serviceFee)}</span>
                </div>
                <div className="mb-3 flex items-center justify-between">
                  <span className="font-semibold text-gray-900">Total</span>
                  <span className="font-extrabold text-gray-900">{formatGBP(totals.total)}</span>
                </div>

                <div className="flex gap-2">
                  <Link
                    href="/basket"
                    onClick={onClose}
                    className="flex-1 inline-flex items-center justify-center px-3 py-2 rounded-md border border-gray-300 text-sm text-gray-900 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  >
                    View basket
                  </Link>
                  <Link
                    href="/checkout"
                    onClick={onClose}
                    className="flex-1 inline-flex items-center justify-center px-3 py-2 rounded-md bg-yellow-500 text-black font-semibold hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  >
                    Checkout
                  </Link>
                </div>
              </>
            )}
          </footer>
        </div>
      </aside>
    </>
  );
}

function Row({ item }: { item: CartItem }) {
  const [qty, setQty] = useState(item.qty);
  useEffect(() => setQty(item.qty), [item.qty]);

  const img = resolveListingImage({ image: item.image, images: undefined, listingImage: undefined });
  const maxQty = item.maxQty || 99; // fallback to 99 for old cart items without maxQty

  return (
    <li className="p-3 flex gap-3 items-center">
      <div className="h-16 w-20 rounded-md overflow-hidden border border-gray-200 bg-gray-50">
  <Image src={img} alt={item.title} width={160} height={120} className="site-image" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-900 line-clamp-2">{item.title}</div>
        <div className="mt-1 text-xs text-gray-500">{maxQty} available</div>
        <div className="mt-2 flex items-center gap-2">
          <div className="inline-flex items-stretch rounded-md border border-gray-300 overflow-hidden">
            <button
              className="px-2 text-sm text-gray-900 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              onClick={() => {
                const next = Math.max(1, qty - 1);
                setQty(next);
                updateQty(item.id, next);
              }}
              aria-label="Decrease quantity"
            >
              −
            </button>
            <input
              type="number"
              min={1}
              max={maxQty}
              value={qty}
              onChange={(e) => setQty(Math.max(1, Math.min(maxQty, parseInt(e.target.value || "1", 10))))}
              onBlur={() => updateQty(item.id, qty)}
              className="w-12 text-center text-sm text-gray-900 bg-white"
              aria-label="Quantity"
            />
            <button
              className="px-2 text-sm text-gray-900 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => {
                const next = Math.min(maxQty, qty + 1);
                setQty(next);
                updateQty(item.id, next);
              }}
              disabled={qty >= maxQty}
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
      <div className="text-sm font-semibold text-gray-900 whitespace-nowrap">{formatGBP(item.price)}</div>
    </li>
  );
}
