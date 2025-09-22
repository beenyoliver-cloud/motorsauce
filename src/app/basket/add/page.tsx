// src/app/basket/add/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { addToCartById } from "@/lib/cartStore";

export default function BasketAddPage() {
  const sp = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const id = sp.get("listing");
    try {
      if (id) addToCartById(id, 1);
      router.replace("/basket?added=1");
    } catch {
      router.replace("/basket?error=notfound");
    }
  }, [sp, router]);

  return (
    <section className="mx-auto max-w-6xl px-4 py-10">
      <div className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-700">
        Adding to basket…
      </div>
    </section>
  );
}
