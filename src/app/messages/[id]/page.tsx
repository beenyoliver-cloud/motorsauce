"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ThreadClientNew from "@/components/ThreadClientNew";

type PageProps = {
  params: { id: string };
};

export default function MessagesThreadPage({ params }: PageProps) {
  const threadId = decodeURIComponent(params.id);

  if (!threadId) {
    return (
      <section className="fixed inset-x-0 top-[100px] bottom-0 md:relative md:py-4 md:px-4 md:max-w-3xl md:mx-auto">
        <div className="h-full flex items-center justify-center">
          <div className="text-sm text-gray-500">Loading...</div>
        </div>
      </section>
    );
  }

  return (
    <section className="w-full min-h-[calc(100vh-96px)] md:min-h-0 md:h-auto md:py-4 md:px-4">
      <div className="min-h-[calc(100vh-140px)] md:min-h-0 md:h-[calc(100vh-200px)] md:max-w-3xl md:mx-auto border-0 md:border md:border-gray-200 md:rounded-xl bg-white md:shadow-sm overflow-hidden flex flex-col">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200 bg-white shrink-0">
          <Link href="/messages" aria-label="Back to messages" className="p-2 -ml-2 rounded-md hover:bg-gray-100 transition text-gray-700">
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
