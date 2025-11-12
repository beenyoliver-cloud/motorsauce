// src/app/basket/add/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { addToCartById } from "@/lib/cartStore";

export default function BasketAddPage() {
  const [sp, setSp] = useState(() => new URLSearchParams(typeof window !== 'undefined' ? window.location.search : ""));
  const router = useRouter();

  useEffect(() => {
    const onPop = () => setSp(new URLSearchParams(window.location.search));
    window.addEventListener("popstate", onPop as EventListener);
    return () => window.removeEventListener("popstate", onPop as EventListener);
  }, []);

  useEffect(() => {
    const id = sp.get("listing");
    (async () => {
      try {
        if (id) await addToCartById(id, 1);
        router.replace("/basket?added=1");
      } catch {
        router.replace("/basket?error=notfound");
      }
    })();
  }, [sp, router]);

  return (
    <section className="mx-auto max-w-6xl px-4 py-10">
      <div className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-700">
        Adding to basket…
      </div>
    </section>
  );
}
