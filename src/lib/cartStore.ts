// src/lib/cartStore.ts
"use client";
import { parseGBP } from "./currency";
import { getListingById, Listing } from "@/lib/listingsService";

export type CartItem = {
  id: string;          // listing id
  title: string;
  image: string;
  price: number;       // numeric £
  seller: { name: string };
  qty: number;
};

export type Cart = {
  items: CartItem[];
  shipping: "standard" | "collection"; // MVP: per-order (not per-item)
};

const KEY = "ms:cart:v1";

function readRaw(): Cart | null {
  try {
    const v = localStorage.getItem(KEY);
    return v ? (JSON.parse(v) as Cart) : null;
  } catch { return null; }
}
function writeRaw(cart: Cart) {
  localStorage.setItem(KEY, JSON.stringify(cart));
  window.dispatchEvent(new Event("ms:cart")); // allow UI to react
}

export function getCart(): Cart {
  if (typeof window === "undefined") return { items: [], shipping: "standard" };
  const v = readRaw();
  return v ?? { items: [], shipping: "standard" };
}

export function setShipping(method: Cart["shipping"]) {
  const cart = getCart();
  cart.shipping = method;
  writeRaw(cart);
}

export async function addToCartById(listingId: string, qty = 1) {
  const cart = getCart();
  const l: Listing | null = await getListingById(listingId);
  if (!l) throw new Error("Listing not found");
  // price in DB may be stored as number or string; attempt to parse
  const price = typeof l.price === 'number' ? l.price : parseGBP(String(l.price || "0"));
  const idx = cart.items.findIndex((i) => i.id === l.id);
  if (idx >= 0) {
    cart.items[idx].qty += qty;
  } else {
    cart.items.push({
      id: l.id,
      title: l.title,
      image: l.image || "/images/placeholder.png",
      price,
      seller: { name: l.seller?.name || "Seller" },
      qty,
    });
  }
  writeRaw(cart);
}

export function updateQty(id: string, qty: number) {
  const cart = getCart();
  const item = cart.items.find((i) => i.id === id);
  if (!item) return;
  item.qty = Math.max(1, Math.min(99, Math.floor(qty || 1)));
  writeRaw(cart);
}

export function removeFromCart(id: string) {
  const cart = getCart();
  cart.items = cart.items.filter((i) => i.id !== id);
  writeRaw(cart);
}

export function clearCart() {
  writeRaw({ items: [], shipping: "standard" });
}

export function calcTotals(cart: Cart) {
  const itemsSubtotal = cart.items.reduce((sum, i) => sum + i.price * i.qty, 0);

  // MVP fees & shipping (simple & predictable)
  const serviceFee = Math.max(0.5, Math.round(itemsSubtotal * 0.025 * 100) / 100); // 2.5%, min 50p
  const shipping = cart.shipping === "standard" ? (cart.items.length > 0 ? 4.99 : 0) : 0;

  const total = itemsSubtotal + serviceFee + shipping;
  return { itemsSubtotal, serviceFee, shipping, total };
}
