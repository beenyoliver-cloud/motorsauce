// src/app/basket/add/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { addToCartById } from "@/lib/cartStore";

export default function BasketAddPage() {
  const [sp, setSp] = useState(() => new URLSearchParams(typeof window !== 'undefined' ? window.location.search : ""));
  const router = useRouter();
 const [error, setError] = useState(false);

  useEffect(() => {
    const onPop = () => setSp(new URLSearchParams(window.location.search));
    window.addEventListener("popstate", onPop as EventListener);
    return () => window.removeEventListener("popstate", onPop as EventListener);
  }, []);

  useEffect(() => {
    const id = sp.get("listing");
    const redirect = sp.get("redirect");
    
    console.log("BasketAddPage mounted - listing id:", id, "redirect:", redirect);
    
    if (!id) {
      console.error("No listing id provided in URL");
      setError(true);
      return;
    }

    let didFinish = false;
    const timer = setTimeout(() => {
      if (!didFinish) {
        console.error("Timeout: add to cart did not finish after 7 seconds");
        setError(true);
      }
    }, 7000);

    (async () => {
      try {
        console.log("Starting addToCartById for listing:", id);
        await addToCartById(id, 1);
        console.log("Successfully added to cart");
        didFinish = true;
        clearTimeout(timer);
        
        // If redirect=checkout, go directly to checkout (for "Buy now")
        if (redirect === "checkout") {
          console.log("Redirecting to checkout");
          router.replace("/checkout");
        } else {
          // Open the cart drawer by dispatching an event
          console.log("Dispatching ms:opencart event and going back");
          window.dispatchEvent(new CustomEvent("ms:opencart"));
          // Small delay to ensure event is processed
          setTimeout(() => {
            router.back();
          }, 100);
        }
      } catch (err) {
        console.error("Failed to add to cart:", err);
        setError(true);
        clearTimeout(timer);
      }
    })();

    return () => {
      clearTimeout(timer);
    };
  }, [sp, router]);

 if (error) {
   return (
     <section className="mx-auto max-w-6xl px-4 py-10">
       <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-800">
         Failed to add item to basket. The listing may no longer exist.
         <div className="mt-3">
           <button
             onClick={() => router.back()}
             className="text-sm underline hover:no-underline"
           >
             Go back
           </button>
         </div>
       </div>
     </section>
   );
 }

  return (
    <section className="mx-auto max-w-6xl px-4 py-10">
      <div className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-700">
        Adding to basket…
      </div>
    </section>
  );
}
