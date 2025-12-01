"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MessageCircle, CheckSquare, Square, Trash2, X, Search, Filter } from "lucide-react";
import { fetchThreads, Thread, deleteThread } from "@/lib/messagesClient";
import { displayName } from "@/lib/names";

export default function MessagesIndex() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedThreads, setSelectedThreads] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterUnread, setFilterUnread] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    const refresh = async () => {
      setLoading(true);
      const t = await fetchThreads();
      setThreads(t);
      setLoading(false);
    };
    
    refresh();
    
    // Poll for updates every 10 seconds
    const interval = setInterval(refresh, 10000);
    return () => clearInterval(interval);
  }, [mounted]);

  const toggleSelectMode = () => {
    setSelectMode(!selectMode);
    setSelectedThreads(new Set());
  };

  const toggleThread = (threadId: string) => {
    const newSelected = new Set(selectedThreads);
    if (newSelected.has(threadId)) {
      newSelected.delete(threadId);
    } else {
      newSelected.add(threadId);
    }
    setSelectedThreads(newSelected);
  };

  const selectAll = () => {
    setSelectedThreads(new Set(filteredThreads.map(t => t.id)));
  };

  const deselectAll = () => {
    setSelectedThreads(new Set());
  };

  const handleBulkDelete = async () => {
    if (selectedThreads.size === 0) return;
    
    const confirmed = window.confirm(
      `Are you sure you want to delete ${selectedThreads.size} conversation${selectedThreads.size > 1 ? 's' : ''}?`
    );
    
    if (!confirmed) return;
    
    setDeleting(true);
    try {
      await Promise.all(
        Array.from(selectedThreads).map(threadId => deleteThread(threadId))
      );
      
      // Refresh threads
      const t = await fetchThreads();
      setThreads(t);
      setSelectedThreads(new Set());
      setSelectMode(false);
    } catch (error) {
      console.error("Failed to delete conversations:", error);
      alert("Failed to delete some conversations. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  const filteredThreads = threads.filter(t => {
    const matchesSearch = searchQuery === "" || 
      displayName(t.peer.name).toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.lastMessage || "").toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = !filterUnread || !t.isRead;
    
    return matchesSearch && matchesFilter;
  });

  if (!mounted || loading) {
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

  if (!loading && threads.length === 0) {
    return (
      <div className="max-w-screen-sm mx-auto p-6 text-center">
        <MessageCircle size={48} className="mx-auto text-gray-300 mb-3" />
        <h2 className="text-lg font-semibold text-gray-900 mb-2">No messages yet</h2>
        <p className="text-sm text-gray-600 mb-4">
          Start a conversation with a seller by clicking &quot;Contact Seller&quot; on any listing.
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
      {/* Header with actions */}
      <div className="border-b border-gray-200 bg-white px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold text-black">Messages</h1>
          <div className="flex items-center gap-2">
            {selectMode ? (
              <>
                {selectedThreads.size > 0 && (
                  <button
                    onClick={handleBulkDelete}
                    disabled={deleting}
                    className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    <Trash2 size={16} />
                    Delete ({selectedThreads.size})
                  </button>
                )}
                <button
                  onClick={toggleSelectMode}
                  className="flex items-center gap-1 px-3 py-1.5 bg-gray-600 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition"
                >
                  <X size={16} />
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={toggleSelectMode}
                className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition"
              >
                <CheckSquare size={16} />
                Select
              </button>
            )}
          </div>
        </div>

        {/* Search and filter */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
            />
          </div>
          <button
            onClick={() => setFilterUnread(!filterUnread)}
            className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition ${
              filterUnread 
                ? 'bg-yellow-500 text-black' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Filter size={16} />
            Unread
          </button>
        </div>

        {/* Bulk actions */}
        {selectMode && (
          <div className="mt-2 flex items-center gap-2 text-sm">
            <button
              onClick={selectAll}
              className="text-yellow-600 hover:text-yellow-700 font-medium"
            >
              Select all
            </button>
            <span className="text-gray-400">•</span>
            <button
              onClick={deselectAll}
              className="text-gray-600 hover:text-gray-700 font-medium"
            >
              Deselect all
            </button>
            <span className="text-gray-500 ml-auto">
              {selectedThreads.size} selected
            </span>
          </div>
        )}
      </div>

      {/* Conversations list */}
      <div className="divide-y divide-gray-200">
        {filteredThreads.length === 0 && !loading ? (
          <div className="p-8 text-center text-sm text-gray-500">
            {searchQuery || filterUnread ? "No conversations found" : "No messages yet"}
          </div>
        ) : (
          filteredThreads.map((t) => {
            const unread = !t.isRead;
            const isSelected = selectedThreads.has(t.id);
            const timestamp = new Date(t.lastMessageAt).toLocaleString('en-GB', { 
              day: '2-digit', 
              month: 'short', 
              hour: '2-digit', 
              minute: '2-digit' 
            });
            
            const content = (
              <>
                {selectMode ? (
                  <div className="flex items-center justify-center w-12 h-12">
                    {isSelected ? (
                      <CheckSquare size={24} className="text-yellow-600" />
                    ) : (
                      <Square size={24} className="text-gray-400" />
                    )}
                  </div>
                ) : t.peer.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img 
                    src={t.peer.avatar} 
                    alt={displayName(t.peer.name)}
                    className="h-12 w-12 rounded-full object-cover bg-gray-100 border-2 border-gray-200"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-full bg-yellow-500 flex items-center justify-center text-black font-bold text-sm border-2 border-yellow-600">
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
                  <p className={`text-sm truncate ${unread ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>
                    {t.lastMessage || "New conversation"}
                  </p>
                  {t.listingRef && (
                    <span className="text-xs text-gray-500 truncate block mt-0.5">
                      About: Listing #{t.listingRef}
                    </span>
                  )}
                </div>
                {!selectMode && unread && (
                  <div className="h-2.5 w-2.5 rounded-full bg-yellow-500 border border-yellow-600" />
                )}
              </>
            );

            if (selectMode) {
              return (
                <button
                  key={t.id}
                  onClick={() => toggleThread(t.id)}
                  className={`w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition text-left ${
                    isSelected ? 'bg-yellow-50' : unread ? 'bg-yellow-50/50' : 'bg-white'
                  }`}
                >
                  {content}
                </button>
              );
            }

            return (
              <Link
                key={t.id}
                href={`/messages/${encodeURIComponent(t.id)}`}
                className={`flex items-center gap-3 p-4 hover:bg-gray-50 transition ${unread ? 'bg-yellow-50' : 'bg-white'}`}
              >
                {content}
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
