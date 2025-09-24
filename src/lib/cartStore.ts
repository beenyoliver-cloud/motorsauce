// src/lib/cartStore.ts
"use client";

export type CartItem = {
  id: string;
  title: string;
  price: string; // "£12.34"
  image: string;
  qty: number;
};

// Back-compat for components that import `Cart`
export type Cart = CartItem[];

const KEY = "ms:cart:v1";

function read(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

function write(items: CartItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent("ms:cart", { detail: { items } }));
}

export function getCart(): CartItem[] {
  return read();
}

export function clearCart() {
  write([]);
}

export async function addToCartById(id: string, qty = 1) {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "";
  const res = await fetch(`${base}/api/listings?id=${encodeURIComponent(id)}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Listing not found");
  const l = await res.json();
  addToCart({
    id: l.id,
    title: l.title,
    price: l.price,
    image: l.image || "/images/placeholder.png",
    qty,
  });
}

export function addToCart(item: CartItem) {
  const items = read();
  const existing = items.find((x) => x.id === item.id);
  if (existing) {
    existing.qty += Math.max(1, item.qty || 1);
  } else {
    items.push({ ...item, qty: Math.max(1, item.qty || 1) });
  }
  write(items);
}

export function removeFromCart(id: string) {
  write(read().filter((x) => x.id !== id));
}

export function setQty(id: string, qty: number) {
  const items = read();
  const item = items.find((x) => x.id === id);
  if (!item) return;
  item.qty = Math.max(1, qty);
  write(items);
}

// Back-compat alias for older code importing `updateQty`
export const updateQty = setQty;

function priceToCents(p: string): number {
  const n = Number(String(p).replace(/[£,]/g, ""));
  return Math.round((isNaN(n) ? 0 : n) * 100);
}

export function totalFormatted(): string {
  const cents = read().reduce((sum, x) => sum + priceToCents(x.price) * x.qty, 0);
  return "£" + (cents / 100).toFixed(2);
}

// Helper some UIs import: returns totals for current (or given) items
export function calcTotals(items: CartItem[] = read()) {
  const count = items.reduce((s, x) => s + x.qty, 0);
  const subtotalCents = items.reduce((s, x) => s + priceToCents(x.price) * x.qty, 0);
  const subtotal = "£" + (subtotalCents / 100).toFixed(2);
  const total = subtotal; // shipping/tax not yet applied
  return { count, subtotalCents, subtotalFormatted: subtotal, totalFormatted: total };
}

export function subscribe(handler: (items: CartItem[]) => void) {
  const cb = (e: Event) => {
    const detail = (e as CustomEvent).detail as { items: CartItem[] };
    handler(detail?.items ?? read());
  };
  if (typeof window !== "undefined") {
    window.addEventListener("ms:cart", cb as EventListener);
    return () => window.removeEventListener("ms:cart", cb as EventListener);
  }
  return () => {};
}
