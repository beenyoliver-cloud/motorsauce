// src/app/messages/reset/page.tsx
"use client";

import { useRouter } from "next/navigation";
import { resetAllChatData } from "@/lib/chatStore";

export default function ResetMessagesPage() {
  const router = useRouter();

  function reset() {
    // 1) Clear local chat threads
    resetAllChatData();

    // 2) Best-effort: clear any local offers cache and notify listeners
    try {
      if (typeof window !== "undefined") {
        for (const k of Object.keys(localStorage)) {
          if (k.startsWith("ms:offers")) localStorage.removeItem(k);
        }
        window.dispatchEvent(new CustomEvent("ms:offers", { detail: { reset: true } }));
      }
    } catch {}

    router.push("/messages");
  }

  return (
    <section className="mx-auto max-w-md px-4 py-8">
      <h1 className="text-2xl font-bold mb-2">Reset Messages & Offers</h1>
      <p className="text-gray-600 mb-4">
        Clears local message threads and any cached offers on this device.
      </p>
      <button
        onClick={reset}
        className="inline-flex items-center gap-2 rounded-md bg-yellow-500 text-black font-semibold px-4 py-2 hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-400"
      >
        Reset now
      </button>
    </section>
  );
}
