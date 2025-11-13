"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { loadThreads, getReadThreads, Thread } from "@/lib/chatStore";
import { displayName } from "@/lib/names";

export default function MessagesIndex() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [readSet, setReadSet] = useState<Set<string>>(new Set());

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const refresh = () => {
      const t = loadThreads().sort((a, b) => b.lastTs - a.lastTs);
      setThreads(t);
      setReadSet(new Set(getReadThreads()));
    };
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("ms:threads", refresh as EventListener);
    window.addEventListener("ms:offers", refresh as EventListener);
    window.addEventListener("ms:unread", refresh as EventListener);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("ms:threads", refresh as EventListener);
      window.removeEventListener("ms:offers", refresh as EventListener);
      window.removeEventListener("ms:unread", refresh as EventListener);
    };
  }, [mounted]);

  if (!mounted) {
    return (
      <div className="max-w-screen-sm mx-auto p-4 space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="border border-gray-200 rounded-lg p-4 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-gray-200" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-1/3" />
                <div className="h-3 bg-gray-100 rounded w-2/3" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (threads.length === 0) {
    return (
      <div className="max-w-screen-sm mx-auto p-6 text-center">
        <MessageCircle size={48} className="mx-auto text-gray-300 mb-3" />
        <h2 className="text-lg font-semibold text-gray-900 mb-2">No messages yet</h2>
        <p className="text-sm text-gray-600 mb-4">
          Start a conversation with a seller by clicking "Contact Seller" on any listing.
        </p>
        <Link
          href="/search"
          className="inline-block px-4 py-2 bg-yellow-500 text-black rounded-lg font-medium hover:bg-yellow-600 transition"
        >
          Browse listings
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-screen-sm mx-auto">
      <div className="border-b border-gray-200 bg-white px-4 py-3 sticky top-0 z-10">
        <h1 className="text-xl font-bold text-black">Messages</h1>
      </div>
      <div className="divide-y divide-gray-200">
        {threads.map((t) => {
          const unread = !readSet.has(t.id);
          const timestamp = new Date(t.lastTs).toLocaleString('en-GB', { 
            day: '2-digit', 
            month: 'short', 
            hour: '2-digit', 
            minute: '2-digit' 
          });
          return (
            <Link
              key={t.id}
              href={`/messages/${encodeURIComponent(t.id)}`}
              className={`flex items-center gap-3 p-4 hover:bg-gray-50 transition ${unread ? 'bg-yellow-50' : 'bg-white'}`}
            >
              {t.peerAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img 
                  src={t.peerAvatar} 
                  alt={displayName(t.peer)}
                  className="h-12 w-12 rounded-full object-cover bg-gray-100 border-2 border-gray-200"
                />
              ) : (
                <div className="h-12 w-12 rounded-full bg-yellow-500 flex items-center justify-center text-black font-bold text-sm border-2 border-yellow-600">
                  {(t.peer || "?").slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className={`text-sm truncate ${unread ? 'font-bold text-black' : 'font-semibold text-gray-900'}`}>
                    {displayName(t.peer)}
                  </h3>
                  <span className="text-xs text-gray-500 whitespace-nowrap ml-2">{timestamp}</span>
                </div>
                <p className={`text-sm truncate ${unread ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>
                  {t.last || "New conversation"}
                </p>
                {t.listingRef && (
                  <span className="text-xs text-gray-500 truncate block mt-0.5">
                    About: Listing #{t.listingRef}
                  </span>
                )}
              </div>
              {unread && (
                <div className="h-2.5 w-2.5 rounded-full bg-yellow-500 border border-yellow-600" />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
