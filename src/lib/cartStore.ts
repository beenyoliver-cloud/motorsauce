"use client";

export type CartItem = { id: string; title: string; price: string; image: string; qty: number };
export type Cart = CartItem[];
const KEY = "ms:cart:v1";

function read(): CartItem[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
function write(v: CartItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(v));
  window.dispatchEvent(new CustomEvent("ms:cart", { detail: { items: v } }));
}

export function getCart(): CartItem[] { return read(); }
export function clearCart() { write([]); }
export function addToCart(item: CartItem) {
  const xs = read(); const ex = xs.find(x => x.id === item.id);
  if (ex) ex.qty += Math.max(1, item.qty || 1); else xs.push({ ...item, qty: Math.max(1, item.qty || 1) });
  write(xs);
}
export function removeFromCart(id: string) { write(read().filter(x => x.id !== id)); }
export function setQty(id: string, qty: number) {
  const xs = read(); const it = xs.find(x => x.id === id); if (!it) return; it.qty = Math.max(1, qty); write(xs);
}
export const updateQty = setQty;

function priceToCents(p: string){ const n = Number(String(p).replace(/[£,]/g,"")); return Math.round((isNaN(n)?0:n)*100); }
export function totalFormatted(){ const c = read().reduce((s,x)=>s+priceToCents(x.price)*x.qty,0); return "£"+(c/100).toFixed(2); }
export function calcTotals(xs: CartItem[] = read()){ const count = xs.reduce((s,x)=>s+x.qty,0);
  const c = xs.reduce((s,x)=>s+priceToCents(x.price)*x.qty,0);
  return { count, subtotalCents:c, subtotalFormatted:"£"+(c/100).toFixed(2), totalFormatted:"£"+(c/100).toFixed(2) };
}
export function subscribe(fn:(xs:CartItem[])=>void){ const cb=(e:Event)=>fn((e as any).detail?.items ?? read());
  if (typeof window !== "undefined"){ window.addEventListener("ms:cart", cb as EventListener); return ()=>window.removeEventListener("ms:cart", cb as EventListener); }
  return ()=>{};
}
