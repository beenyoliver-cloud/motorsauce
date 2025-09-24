"use client";
export function formatGBP(cents: number){ return `£${(cents/100).toFixed(2)}`; }
export function createOffer(..._args:any[]){ return null as any; }
export function updateOfferStatus(..._args:any[]){ return null as any; }
export function listOffers(..._args:any[]){ return [] as any[]; }
export function latestOffer(..._args:any[]){ return undefined as any; }
export function resetAllOffers(): void {
  if (typeof window === "undefined") return;
  try {
    for (const k of Object.keys(localStorage)) if (k.startsWith("ms:offers")) localStorage.removeItem(k);
    window.dispatchEvent(new CustomEvent("ms:offers", { detail: { reset: true } }));
  } catch {}
}
