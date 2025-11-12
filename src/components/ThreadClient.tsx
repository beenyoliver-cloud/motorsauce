// src/components/ThreadClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, Calendar, Trash2 } from "lucide-react";
import ActiveOfferBar from "@/components/ActiveOfferBar";
import OfferMessage from "@/components/OfferMessage";
import {
  appendMessage,
  getReadThreads,
  setReadThreads,
  nowClock,
  publishUnread,
  loadThreads,
  deleteThread as deleteThreadStore,
  Thread,
} from "@/lib/chatStore";
import { getCurrentUserSync } from "@/lib/auth";
import { displayName } from "@/lib/names";
import { supabaseBrowser } from "@/lib/supabase";

type PeerProfile = {
  name: string;
  email: string;
  created_at: string;
  avatar?: string;
};

export default function ThreadClient({
  threadId,
  forceOfferToast = false,
}: {
  threadId: string;
  forceOfferToast?: boolean;
}) {
  const router = useRouter();
  const me = getCurrentUserSync();
  const selfName = me?.name?.trim() || "You";

  // --- Hydration-safe: render a stable skeleton until mounted
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Peer profile data
  const [peerProfile, setPeerProfile] = useState<PeerProfile | null>(null);

  // Only load threads AFTER mount (so server & client initial HTML match)
  const [threads, setThreads] = useState<Thread[]>([]);
  useEffect(() => {
    if (!mounted) return;
    setThreads(loadThreads());
  }, [mounted]);

  // Live updates
  useEffect(() => {
    if (!mounted) return;
    const refresh = () => setThreads(loadThreads());
    window.addEventListener("ms:threads", refresh as EventListener);
    window.addEventListener("storage", refresh as EventListener);
    return () => {
      window.removeEventListener("ms:threads", refresh as EventListener);
      window.removeEventListener("storage", refresh as EventListener);
    };
  }, [mounted]);

  const thread = useMemo(
    () => threads.find((t) => t.id === threadId),
    [threads, threadId]
  );

  // Fetch peer profile when thread changes
  useEffect(() => {
    if (!mounted || !thread) return;
    
    const fetchPeerProfile = async () => {
      const supabase = supabaseBrowser();
      const { data } = await supabase
        .from('profiles')
        .select('name, email, created_at')
        .eq('name', thread.peer)
        .single();
      
      if (data) {
        setPeerProfile(data);
      }
    };
    
    fetchPeerProfile();
  }, [mounted, thread]);

  // Mark read once we actually have the thread on the client
  useEffect(() => {
    if (!mounted || !thread) return;
    const read = new Set(getReadThreads());
    if (!read.has(thread.id)) {
      read.add(thread.id);
      setReadThreads([...read]);
      publishUnread(threads, Array.from(read));
    }
  }, [mounted, thread, threads]);

  function send(text: string) {
    if (!text.trim() || !thread) return;
    appendMessage(thread.id, {
      id: `m_${Date.now()}`,
      from: selfName,
      ts: nowClock(),
      type: "text",
      text: text.trim(),
    });
  }

  function handleDelete() {
    if (!thread) return;
    deleteThreadStore(thread.id);       // remove from *my* buckets (v2/v1 id+name)
    setThreads(loadThreads());          // refresh my in-memory list
    router.push("/messages");           // and navigate back to inbox
  }

  // --------- SKELETON (SSR + first client render) ----------
  if (!mounted) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-gray-200 p-3">
          <div className="min-w-0">
            <div className="h-4 w-40 rounded bg-gray-200 animate-pulse" />
            <div className="mt-1 h-3 w-28 rounded bg-gray-100 animate-pulse" />
          </div>
          <div className="h-7 w-16 rounded bg-gray-100 animate-pulse" />
        </div>
        <div className="flex-1 space-y-2 p-3">
          <div className="h-16 rounded bg-gray-50 border border-gray-200" />
          <div className="h-16 rounded bg-gray-50 border border-gray-200" />
        </div>
        <div className="border-t border-gray-200 p-3">
          <div className="h-10 rounded bg-gray-50 border border-gray-200" />
        </div>
      </div>
    );
  }

  // --------- Client-only states after mount ----------
  if (!thread) {
    return (
      <div className="p-6">
        <div className="text-sm text-gray-700">
          This conversation was removed or doesn’t exist.
        </div>
        <Link
          href="/messages"
          className="mt-2 inline-block text-sm text-gray-900 underline"
        >
          Back to messages
        </Link>
      </div>
    );
  }

  const memberSince = peerProfile?.created_at 
    ? new Date(peerProfile.created_at).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
    : null;

  return (
    <div className="flex h-full flex-col">
      {/* User Profile Bar */}
      <div className="border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between p-4">
          <Link 
            href={`/profile/${encodeURIComponent(thread.peer)}`}
            className="flex items-center gap-3 min-w-0 flex-1 hover:opacity-80 transition"
          >
            {thread.peerAvatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img 
                src={thread.peerAvatar} 
                alt={displayName(thread.peer)}
                className="h-12 w-12 rounded-full object-cover bg-gray-100 border-2 border-yellow-500"
              />
            ) : (
              <div className="h-12 w-12 rounded-full bg-yellow-500 flex items-center justify-center text-black font-bold text-lg border-2 border-yellow-600">
                {(thread.peer || "?").slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-black truncate">
                  {displayName(thread.peer)}
                </h2>
                <User size={14} className="text-gray-400" />
              </div>
              {memberSince && (
                <div className="flex items-center gap-1 text-xs text-gray-600">
                  <Calendar size={12} />
                  <span>Member since {memberSince}</span>
                </div>
              )}
              {thread.listingRef && (
                <div className="text-xs text-gray-500 truncate mt-0.5">
                  About: Listing #{thread.listingRef}
                </div>
              )}
            </div>
          </Link>
          <button
            onClick={handleDelete}
            className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition"
            title="Delete this conversation (only for you)"
          >
            <Trash2 size={16} />
            Delete
          </button>
        </div>
      </div>

      {/* Active offer bar (shows accept/decline/counter to the recipient only) */}
      <ActiveOfferBar threadId={thread.id} />

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3">
        {thread.messages.map((m) => {
          if (m.type === "offer") {
            return (
              <OfferMessage
                key={m._k || m.id}
                msg={{
                  id: m.id || "",
                  threadId: thread.id,
                  type: "offer",
                  offer: m.offer
                    ? {
                        ...m.offer,
                        currency: m.offer.currency ?? "GBP",
                        status: (m.offer.status === "started"
                          ? "pending"
                          : m.offer.status === "expired"
                          ? "withdrawn"
                          : m.offer.status) as "pending" | "accepted" | "declined" | "countered" | "withdrawn",
                        listingId: (m.offer.listingId ?? "") as string | number,
                      }
                    : undefined,
                }}
                currentUser={selfName}
              />
            );
          }
          return (
            <div key={m._k || m.id} className="my-1">
              <div className="text-[11px] text-gray-500">
                {displayName(m.from || "Unknown")}
              </div>
              <div className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900">
                {m.text}
              </div>
            </div>
          );
        })}
      </div>

      {/* Composer */}
      <div className="border-t border-gray-200 p-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const text = String(fd.get("text") || "");
            (e.currentTarget as HTMLFormElement).reset();
            send(text);
          }}
          className="flex gap-2"
        >
          <input
            name="text"
            placeholder="Type a message"
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
            autoComplete="off"
          />
          <button className="rounded-md bg-gray-900 px-3 py-2 text-sm font-semibold text-white hover:bg-black">
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
