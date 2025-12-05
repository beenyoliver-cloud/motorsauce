"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Edit3, Trash2, X } from "lucide-react";
import { Thread } from "@/lib/messagesClient";
import { getCurrentUser, type LocalUser } from "@/lib/auth";
import { displayName } from "@/lib/names";

type Props = { children: React.ReactNode };

type PeerItem = {
  threadId: string;
  name: string;
  last: string;
  lastTs: number;
  unread: boolean;
  avatar?: string;
  listing?: {
    id: string;
    title: string;
    image?: string | null;
  } | null;
};

function threadsToPeers(threads: Thread[]): PeerItem[] {
  return threads
    .map((t) => {
      const name = (t.peer?.name || "Unknown").toString();
      return {
        threadId: t.id,
        name,
        last: t.lastMessage || "",
        lastTs: new Date(t.lastMessageAt || 0).getTime(),
        unread: !t.isRead,
        avatar: t.peer?.avatar,
        listing: t.listing || null,
      };
    })
    .sort((a, b) => b.lastTs - a.lastTs);
}

export default function MessagesLayout({ children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [me, setMe] = useState<LocalUser | null>(null);
  const selfName = (me?.name || "You").trim();

  const [mounted, setMounted] = useState(false);
  const [peers, setPeers] = useState<PeerItem[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [selectedThreads, setSelectedThreads] = useState<Set<string>>(new Set());

  useEffect(() => {
    let alive = true;
    (async () => {
      const u = await getCurrentUser();
      if (!alive) return;
      setMe(u);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const activeId = useMemo(() => {
    const m = pathname?.match(/\/messages\/([^/?#]+)/);
    return m ? decodeURIComponent(m[1]) : "";
  }, [pathname]);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    const refresh = async () => {
      try {
        const res = await fetch("/api/messages/threads");
        if (!res.ok) throw new Error("Failed to fetch threads");
        const data = await res.json();
        setPeers(threadsToPeers(data));
      } catch (err) {
        console.error("Failed to refresh threads:", err);
      }
    };
    refresh();
    window.addEventListener("ms:threads", refresh as EventListener);
    window.addEventListener("ms:unread", refresh as EventListener);
    return () => {
      window.removeEventListener("ms:threads", refresh as EventListener);
      window.removeEventListener("ms:unread", refresh as EventListener);
    };
  }, [mounted]);

  function handleToggleThread(threadId: string) {
    setSelectedThreads(prev => {
      const next = new Set(prev);
      if (next.has(threadId)) {
        next.delete(threadId);
      } else {
        next.add(threadId);
      }
      return next;
    });
  }

  function handleDeleteSelected() {
    if (selectedThreads.size === 0) return;
    
    const confirmed = window.confirm(
      `Delete ${selectedThreads.size} conversation${selectedThreads.size > 1 ? 's' : ''}? This cannot be undone.`
    );
    
    if (!confirmed) return;

    // Delete threads via API
    selectedThreads.forEach(async (threadId) => {
      try {
        await fetch(`/api/messages/${threadId}`, { method: "DELETE" });
      } catch (err) {
        console.error("Failed to delete thread:", err);
      }
    });

    setSelectedThreads(new Set());
    // Refresh threads from API
    (async () => {
      try {
        const res = await fetch("/api/messages/threads");
        if (res.ok) {
          const data = await res.json();
          setPeers(threadsToPeers(data));
        }
      } catch (err) {
        console.error("Failed to refresh threads:", err);
      }
    })();
    setEditMode(false);
    
    // If current thread was deleted, navigate to messages home
    if (selectedThreads.has(activeId)) {
      router.push('/messages');
    }
  }

  function handleCancelEdit() {
    setEditMode(false);
    setSelectedThreads(new Set());
  }

  if (!mounted) {
    return (
      <section className="h-full grid grid-cols-1 md:grid-cols-[280px_1fr]">
        <aside className="hidden md:block border-r border-gray-200 p-3 space-y-2">
          <div className="h-6 w-32 rounded bg-gray-200 animate-pulse" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 rounded bg-gray-50 border border-gray-200 animate-pulse" />
          ))}
        </aside>
        <main className="min-h-0">{children}</main>
      </section>
    );
  }

  return (
    <section className="h-full grid grid-cols-1 md:grid-cols-[300px_1fr]">
      <aside className="hidden md:flex border-r border-gray-200 flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="mb-2 text-xs text-gray-600">Signed in as</div>
          <div className="mb-3 text-sm font-semibold text-black">{displayName(selfName)}</div>

          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-gray-700">
              Conversations {peers.length > 0 && `(${peers.length})`}
            </div>
            {!editMode && peers.length > 0 && (
              <button
                onClick={() => setEditMode(true)}
                className="flex items-center gap-1 text-xs text-gray-600 hover:text-black transition"
                title="Edit conversations"
              >
                <Edit3 size={14} />
                Edit
              </button>
            )}
          </div>
        </div>

        {/* Edit Mode Controls */}
        {editMode && (
          <div className="p-3 bg-yellow-50 border-b border-yellow-200 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-900">
              {selectedThreads.size} selected
            </span>
            <div className="flex gap-2">
              <button
                onClick={handleDeleteSelected}
                disabled={selectedThreads.size === 0}
                className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <Trash2 size={14} />
                Delete
              </button>
              <button
                onClick={handleCancelEdit}
                className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 bg-white text-gray-700 text-xs font-medium rounded-md hover:bg-gray-50 transition"
              >
                <X size={14} />
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Conversations List */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {peers.length === 0 ? (
            <div className="text-sm text-gray-600 py-4">No conversations yet.</div>
          ) : (
            peers.map((p) => {
              const isActive = p.threadId === activeId;
              const isSelected = selectedThreads.has(p.threadId);
              
              if (editMode) {
                return (
                  <div
                    key={p.threadId}
                    onClick={() => handleToggleThread(p.threadId)}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer transition ${
                      isSelected ? "bg-yellow-100 border-2 border-yellow-500" : "hover:bg-gray-50 border-2 border-transparent"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      className="h-4 w-4 rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"
                    />
                    {p.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.avatar} alt="" className="h-10 w-10 rounded-full object-cover bg-gray-100" />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-yellow-500 text-black flex items-center justify-center text-xs font-bold">
                        {(p.name || "?").slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-black">
                        {displayName(p.name || "Unknown")}
                      </div>
                      <div className="truncate text-xs text-gray-600">
                        {p.last || "\u00A0"}
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <Link
                  key={p.threadId}
                  href={`/messages/${encodeURIComponent(p.threadId)}`}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition ${
                    isActive ? "bg-gray-900 text-white" : "hover:bg-gray-50"
                  }`}
                >
                  {p.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.avatar} alt="" className="h-10 w-10 rounded-full object-cover bg-gray-100" />
                  ) : (
                    <div
                      className={`h-10 w-10 rounded-full ${
                        isActive ? "bg-white text-black" : "bg-yellow-500 text-black"
                      } flex items-center justify-center text-xs font-bold`}
                    >
                      {(p.name || "?").slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <div className={`truncate text-sm ${isActive ? "font-semibold" : "font-medium text-black"}`}>
                        {displayName(p.name || "Unknown")}
                      </div>
                      {p.unread && !isActive && <span className="ml-2 h-2 w-2 rounded-full bg-yellow-500" />}
                    </div>
                    {p.listing && p.listing.image && (
                      <div className="flex items-center gap-2 mt-1">
                        <img
                          src={p.listing.image}
                          alt={p.listing.title}
                          className="h-6 w-6 rounded object-cover bg-gray-100"
                        />
                        <div className={`truncate text-xs ${isActive ? "text-gray-400" : "text-gray-500"}`}>
                          {p.listing.title}
                        </div>
                      </div>
                    )}
                    <div className={`truncate text-xs ${isActive ? "text-gray-300" : "text-gray-600"}`}>
                      {p.last || "\u00A0"}
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </nav>
      </aside>
      <main className="min-h-0">{children}</main>
    </section>
  );
}
