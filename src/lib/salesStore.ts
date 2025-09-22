"use client";

import { nsKey } from "@/lib/auth";

export type Sale = { id: string; title: string; price: string; ts: string };

export function loadSales(): Sale[] {
  try {
    const raw = localStorage.getItem(nsKey("sales_v1"));
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}
export function addSale(s: Sale) {
  const arr = loadSales();
  arr.unshift(s);
  localStorage.setItem(nsKey("sales_v1"), JSON.stringify(arr));
}
