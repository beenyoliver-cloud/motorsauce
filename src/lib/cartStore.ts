// src/lib/cartStore.ts
"use client";

type CartItem = {
  id: string;
  title: string;
  price: string; // "£12.34"
  image: string;
  qty: number;
};

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
    existing.qty += item.qty;
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

export function totalFormatted(): string {
  const pence = read().reduce((sum, x) => {
    const n = Number(String(x.price).replace(/[£,]/g, ""));
    return sum + Math.round((isNaN(n) ? 0 : n) * 100) * x.qty;
  }, 0);
  return "£" + (pence / 100).toFixed(2);
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
