// src/app/messages/reset/page.tsx
"use client";

import { useRouter } from "next/navigation";
import { resetAllChatData } from "@/lib/chatStore";
import { resetAllOffers } from "@/lib/offersStore";

export default function ResetMessagesPage() {
  const router = useRouter();

  function doReset() {
    // Wipe all chat & offers data in this browser (all accounts)
    resetAllChatData();
    resetAllOffers();
    router.replace("/messages");
  }

  return (
    <section className="mx-auto max-w-md px-4 py-12">
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h1 className="text-lg font-semibold text-black">Reset all messages</h1>
        <p className="mt-2 text-sm text-gray-700">
          This clears every conversation, message, read flag, and offer stored in this browser — for all
          accounts on this device. You’ll start fresh with an empty inbox.
        </p>

        <div className="mt-5 flex items-center gap-2">
          <button
            onClick={doReset}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
          >
            Reset now
          </button>
          <button
            onClick={() => router.back()}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </section>
  );
}
