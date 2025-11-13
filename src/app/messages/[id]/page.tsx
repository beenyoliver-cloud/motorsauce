"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ThreadClient from "@/components/ThreadClient";

export default function MessagesThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params); // Next 15+ unwrap
  const threadId = decodeURIComponent(id);
  const [forceOfferToast, setForceOfferToast] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setForceOfferToast(params.get("offer") ? true : false);
  }, []);

  return (
    <section className="h-[calc(100vh-60px)] max-w-screen-sm mx-auto w-full flex flex-col">
      {/* Top bar (mobile-focused) */}
      <div className="md:hidden flex items-center gap-2 px-3 py-2 border-b border-gray-200 bg-white sticky top-0 z-20">
        <Link href="/messages" aria-label="Back to messages" className="p-2 -ml-2 rounded-md hover:bg-gray-100">
          <ArrowLeft size={20} />
        </Link>
        <div className="text-sm font-semibold text-gray-900 truncate">Conversation</div>
      </div>
      <div className="flex-1 overflow-hidden">
        <ThreadClient threadId={threadId} forceOfferToast={forceOfferToast} />
      </div>
    </section>
  );
}
