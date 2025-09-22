// src/lib/currency.ts
export function parseGBP(x: string | number): number {
  if (typeof x === "number") return x;
  const n = x.replace(/[^\d.]/g, "");
  const v = parseFloat(n);
  return Number.isFinite(v) ? v : 0;
}
export function formatGBP(n: number): string {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(n);
}
