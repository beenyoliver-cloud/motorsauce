"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Search } from "lucide-react";
import ThreadClientNew from "@/components/ThreadClientNew";
import { fetchThreads, Thread } from "@/lib/messagesClient";
import { displayName } from "@/lib/names";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default function MessagesThreadPage({ params }: PageProps) {
  const router = useRouter();
  const [threadId, setThreadId] = useState<string>("");
  const [threads, setThreads] = useState<Thread[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingThreads, setLoadingThreads] = useState(true);

  useEffect(() => {
    params.then(p => setThreadId(decodeURIComponent(p.id)));
  }, [params]);

  useEffect(() => {
    const loadConversations = async () => {
      setLoadingThreads(true);
      const t = await fetchThreads();
      setThreads(t);
      setLoadingThreads(false);
    };
    loadConversations();
    
    // Poll for updates every 10 seconds
    const interval = setInterval(loadConversations, 10000);
    return () => clearInterval(interval);
  }, []);

  const filteredThreads = threads.filter(t => 
    displayName(t.peer.name).toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.lastMessage || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!threadId) {
    return (
      <section className="fixed inset-0 md:relative md:py-4 md:px-4 md:max-w-7xl md:mx-auto">
        <div className="h-full flex items-center justify-center">
          <div className="text-sm text-gray-500">Loading...</div>
        </div>
      </section>
    );
  }

  return (
    <section className="fixed inset-0 md:relative md:py-4 md:px-4 md:max-w-7xl md:mx-auto">
      <div className="h-full md:h-[calc(100vh-8rem)] border-0 md:border md:border-gray-200 md:rounded-xl bg-white md:shadow-sm overflow-hidden flex">
        {/* Conversations sidebar (desktop only) */}
        <div className="hidden md:flex md:flex-col md:w-80 md:border-r md:border-gray-200 md:bg-gray-50">
          {/* Sidebar header */}
          <div className="px-4 py-3 border-b border-gray-200 bg-white">
            <h2 className="text-lg font-bold text-gray-900">Messages</h2>
          </div>
          
          {/* Search */}
          <div className="px-3 py-2 bg-white border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
              />
            </div>
          </div>

          {/* Conversations list */}
          <div className="flex-1 overflow-y-auto">
            {loadingThreads ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="p-3 rounded-lg bg-white animate-pulse">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gray-200" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 bg-gray-200 rounded w-1/2" />
                        <div className="h-2 bg-gray-100 rounded w-3/4" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredThreads.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500">
                {searchQuery ? "No conversations found" : "No messages yet"}
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {filteredThreads.map((t) => {
                  const isActive = t.id === threadId;
                  const unread = !t.isRead;
                  const timestamp = new Date(t.lastMessageAt).toLocaleString('en-GB', { 
                    day: '2-digit', 
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit'
                  });
                  
                  return (
                    <button
                      key={t.id}
                      onClick={() => router.push(`/messages/${encodeURIComponent(t.id)}`)}
                      className={`w-full text-left p-3 rounded-lg transition ${
                        isActive 
                          ? 'bg-yellow-100 border-2 border-yellow-500' 
                          : unread
                            ? 'bg-yellow-50 hover:bg-yellow-100'
                            : 'bg-white hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {t.peer.avatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img 
                            src={t.peer.avatar} 
                            alt={displayName(t.peer.name)}
                            className="h-10 w-10 rounded-full object-cover bg-gray-100 border-2 border-gray-200"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-yellow-500 flex items-center justify-center text-black font-bold text-xs border-2 border-yellow-600">
                            {(t.peer.name || "?").slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className={`text-sm truncate ${unread ? 'font-bold text-black' : 'font-semibold text-gray-900'}`}>
                              {displayName(t.peer.name)}
                            </h3>
                            <span className="text-xs text-gray-500 whitespace-nowrap ml-2">{timestamp}</span>
                          </div>
                          <p className={`text-xs truncate ${unread ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>
                            {t.lastMessage || "New conversation"}
                          </p>
                        </div>
                        {unread && !isActive && (
                          <div className="h-2 w-2 rounded-full bg-yellow-500 border border-yellow-600" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Main conversation area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top bar (mobile only) */}
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
      </div>
    </section>
  );
}
