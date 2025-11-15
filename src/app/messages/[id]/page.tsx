"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ThreadClientNew from "@/components/ThreadClientNew";

export default function MessagesThreadPage({ params }: { params: { id: string } }) {
  // Params are already resolved for client components; avoid React experimental use() which breaks on client.
  const threadId = decodeURIComponent(params.id);
  const [forceOfferToast, setForceOfferToast] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setForceOfferToast(params.get("offer") ? true : false);
  }, []);

  return (
    <section className="fixed inset-0 md:relative md:py-4 md:px-4 md:max-w-5xl md:mx-auto">
      <div className="h-full md:h-[calc(100vh-8rem)] border-0 md:border md:border-gray-200 md:rounded-xl bg-white md:shadow-sm overflow-hidden flex flex-col">
        {/* Top bar (mobile-focused) */}
        <div className="md:hidden flex items-center gap-2 px-3 py-2 border-b border-gray-200 bg-white shrink-0">
          <Link href="/messages" aria-label="Back to messages" className="p-2 -ml-2 rounded-md hover:bg-gray-100">
            <ArrowLeft size={20} />
          </Link>
          <div className="text-sm font-semibold text-gray-900 truncate">Conversation</div>
        </div>
        <div className="flex-1 min-h-0 overflow-hidden">
          <ThreadClientNew threadId={threadId} />
        </div>
      </div>
    </section>
  );
}
