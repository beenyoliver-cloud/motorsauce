"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ThreadClientNew from "@/components/ThreadClientNew";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default function MessagesThreadPage({ params }: PageProps) {
  // For client components in Next.js 15, we need to unwrap params
  const [threadId, setThreadId] = useState<string>("");

  useEffect(() => {
    params.then(p => setThreadId(decodeURIComponent(p.id)));
  }, [params]);
  const [forceOfferToast, setForceOfferToast] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setForceOfferToast(params.get("offer") ? true : false);
  }, []);

  if (!threadId) {
    return (
      <section className="fixed inset-0 md:relative md:py-4 md:px-4 md:max-w-5xl md:mx-auto">
        <div className="h-full flex items-center justify-center">
          <div className="text-sm text-gray-500">Loading...</div>
        </div>
      </section>
    );
  }

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
