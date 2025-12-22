"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { fetchThreads, type Thread } from "@/lib/messagesClient";
import { supabaseBrowser } from "@/lib/supabase";

type Props = { children: React.ReactNode };

type PeerItem = {
  threadId: string;
  name: string;
  last: string;
  lastTs: number;
  unread: boolean;
};

function threadsToPeers(threads: Thread[]): PeerItem[] {
  return threads
    .map((thread) => ({
      threadId: thread.id,
      name: thread.peer?.name || "Unknown",
      last: thread.lastMessage || "",
      lastTs: new Date(thread.lastMessageAt || thread.createdAt).getTime(),
      unread: !thread.isRead,
    }))
    .sort((a, b) => b.lastTs - a.lastTs);
}

export default function MessagesLayout({ children }: Props) {
  const pathname = usePathname();
  const [peers, setPeers] = useState<PeerItem[]>([]);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedThreads, setSelectedThreads] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const supabase = useMemo(() => supabaseBrowser(), []);

  const activeId = useMemo(() => {
    const match = pathname?.match(/\/messages\/([^/?#]+)/);
    return match ? decodeURIComponent(match[1]) : "";
  }, [pathname]);

  const refreshThreads = useCallback(async () => {
    setLoading(true);
    try {
      const threads = await fetchThreads();
      setPeers(threadsToPeers(threads));
    } catch (err) {
      console.error("[MessagesLayout] Failed to load threads", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshThreads();
    const onUpdate = () => refreshThreads();
    window.addEventListener("ms:threads", onUpdate as EventListener);
    window.addEventListener("ms:unread", onUpdate as EventListener);
    return () => {
      window.removeEventListener("ms:threads", onUpdate as EventListener);
      window.removeEventListener("ms:unread", onUpdate as EventListener);
    };
  }, [refreshThreads]);

  function toggleSelectMode() {
    setSelectMode((mode) => {
      if (mode) setSelectedThreads(new Set());
      return !mode;
    });
  }

  function toggleThread(threadId: string) {
    setSelectedThreads((prev) => {
      const next = new Set(prev);
      if (next.has(threadId)) next.delete(threadId);
      else next.add(threadId);
      return next;
    });
  }

  async function handleDeleteSelected() {
    if (selectedThreads.size === 0) return;
    const confirmDelete = window.confirm(
      `Delete ${selectedThreads.size} conversation${selectedThreads.size > 1 ? "s" : ""}?`
    );
    if (!confirmDelete) return;

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        alert("Please sign in again to delete conversations.");
        return;
      }
      const token = session.session.access_token;
      await Promise.all(
        Array.from(selectedThreads).map((threadId) =>
          fetch(`/api/messages/${encodeURIComponent(threadId)}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          }).catch((err) => console.error("Failed to delete thread", threadId, err))
        )
      );
      setSelectedThreads(new Set());
      setSelectMode(false);
      refreshThreads();
    } catch (err) {
      console.error("[MessagesLayout] Failed to delete threads", err);
      alert("Failed to delete conversations. Please try again.");
    }
  }

  return (
    <section className="flex flex-col md:flex-row gap-3 md:gap-6">
      <aside className="md:w-72 shrink-0 rounded-2xl border border-gray-200 bg-white p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Inbox</h2>
          <div className="flex gap-2">
            <Link href="/messages" className="text-xs font-medium text-yellow-700 hover:text-yellow-900">
              View all
            </Link>
            <button
              onClick={toggleSelectMode}
              className="text-xs font-medium text-gray-500 hover:text-gray-900"
            >
              {selectMode ? "Cancel" : "Select"}
            </button>
          </div>
        </div>
        {selectMode && (
          <button
            onClick={handleDeleteSelected}
            disabled={selectedThreads.size === 0}
            className="text-xs font-medium text-red-600 hover:text-red-800 disabled:text-gray-300"
          >
            Delete selected
          </button>
        )}

        <div className="h-px bg-gray-100" />

        {loading ? (
          <div className="text-xs text-gray-500">Loading threads…</div>
        ) : peers.length === 0 ? (
          <p className="text-xs text-gray-500">No conversations yet.</p>
        ) : (
          <ul className="space-y-2 max-h-[60vh] overflow-y-auto">
            {peers.map((peer) => {
              const selected = selectedThreads.has(peer.threadId);
              const isActive = activeId === peer.threadId;
              return (
                <li key={peer.threadId}>
                  <Link
                    href={`/messages/${encodeURIComponent(peer.threadId)}`}
                    className={`block rounded-xl border px-3 py-2 text-sm ${
                      isActive ? "border-gray-900 bg-gray-50" : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={(event) => {
                      if (selectMode) {
                        event.preventDefault();
                        toggleThread(peer.threadId);
                      }
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-gray-900">{peer.name}</span>
                      {peer.unread && !selectMode && (
                        <span className="inline-flex h-2 w-2 rounded-full bg-yellow-500" />
                      )}
                      {selectMode && (
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleThread(peer.threadId)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      )}
                    </div>
                    <p className="text-xs text-gray-600 line-clamp-1">{peer.last || "No messages yet"}</p>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </aside>

      <main className="flex-1 min-w-0">{children}</main>
    </section>
  );
}
