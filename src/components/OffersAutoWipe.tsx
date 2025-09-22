// src/components/OffersAutoWipe.tsx
"use client";

import { useEffect } from "react";

export default function OffersAutoWipe() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const FLAG = "ms:offers_wiped_v2";
      if (localStorage.getItem(FLAG) === "1") return;

      const toRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i) || "";
        if (k.startsWith("ms:offers")) toRemove.push(k);
      }
      toRemove.forEach((k) => localStorage.removeItem(k));
      localStorage.setItem(FLAG, "1");
      // notify any listeners so UIs refresh
      window.dispatchEvent(new CustomEvent("ms:offers", { detail: { threadId: "*" } }));
    } catch {
      // ignore
    }
  }, []);

  return null;
}
