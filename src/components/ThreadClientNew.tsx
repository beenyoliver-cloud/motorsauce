// src/components/ThreadClientNew.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, Calendar, Trash2 } from "lucide-react";
import {
  fetchMessages,
  sendMessage,
  markThreadRead,
  deleteThread as apiDeleteThread,
  Message,
} from "@/lib/messagesClient";
import { getCurrentUser } from "@/lib/auth";
import { displayName } from "@/lib/names";
import { supabaseBrowser } from "@/lib/supabase";

type PeerProfile = {
  id: string;
  name: string;
  email: string;
  created_at: string;
  avatar?: string;
};

export default function ThreadClientNew({
  threadId,
}: {
  threadId: string;
}) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [peerProfile, setPeerProfile] = useState<PeerProfile | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<string>("");
  const draftKey = `ms_thread_draft:${threadId}`;
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { setMounted(true); }, []);

  // Fetch current user
  useEffect(() => {
    if (!mounted) return;
    (async () => {
      try {
        const user = await getCurrentUser();
        setCurrentUserId(user?.id || null);
      } catch {}
    })();
  }, [mounted]);

  // Load draft from localStorage
  useEffect(() => {
    if (!mounted) return;
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) setDraft(saved);
    } catch {}
  }, [mounted, draftKey]);

  // Persist draft
  useEffect(() => {
    try {
      localStorage.setItem(draftKey, draft);
    } catch {}
  }, [draft, draftKey]);

  // Fetch messages and peer profile (initial + polling refresh without nuking input)
  useEffect(() => {
    if (!mounted || !currentUserId) return;

    let active = true;
    const supabase = supabaseBrowser();

    const loadData = async (initial = false) => {
      try {
        if (initial) {
          setIsInitialLoading(true);
        } else {
          setIsRefreshing(true);
        }
        const msgs = await fetchMessages(threadId);
        if (!active) return;
        setMessages(msgs);

        // Derive peer from messages if any
        let peerId = msgs.find(m => m.from.id !== currentUserId)?.from.id;

        // Fallback: fetch thread participants if no messages yet (new conversation)
        if (!peerId) {
          const { data: threadRow, error: threadErr } = await supabase
            .from("threads")
            .select("participant_1_id, participant_2_id")
            .eq("id", threadId)
            .single();
          if (!threadErr && threadRow) {
            const { participant_1_id, participant_2_id } = threadRow as any;
            if (participant_1_id && participant_2_id) {
              peerId = participant_1_id === currentUserId ? participant_2_id : participant_1_id;
            }
          }
        }

        if (peerId) {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("id, name, email, created_at, avatar")
            .eq("id", peerId)
            .single();
          if (profileData) setPeerProfile(profileData);
        }

        setError(null);
      } catch (err: any) {
        console.error("[ThreadClientNew] Load error:", err);
        if (active) setError(err.message || "Failed to load messages");
      } finally {
        if (active) {
          setIsInitialLoading(false);
          setIsRefreshing(false);
        }
      }
    };

    loadData(true);
    markThreadRead(threadId);
    const interval = setInterval(() => loadData(false), 5000);
    return () => { active = false; clearInterval(interval); };
  }, [mounted, currentUserId, threadId]);

  // Auto-scroll on new messages
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || messages.length === 0) return;
    requestAnimationFrame(() => { el.scrollTop = el.scrollHeight; });
  }, [messages.length]);

  async function handleSend(text: string) {
    if (!text.trim()) return;
    const sent = await sendMessage(threadId, text);
    if (sent) {
      // Optimistically add to local state
      setMessages(prev => [...prev, sent]);
    }
  }

  async function handleDelete() {
    const success = await apiDeleteThread(threadId);
    if (success) {
      router.push("/messages");
    }
  }

  // Skeleton while loading
  if (!mounted || isInitialLoading) {
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

  if (error) {
    return (
      <div className="p-6">
        <div className="text-sm text-red-600 mb-2">Error: {error}</div>
        <Link
          href="/messages"
          className="inline-block text-sm text-gray-900 underline"
        >
          Back to messages
        </Link>
      </div>
    );
  }

  // Show header even if there are no messages yet (new thread)
  const showEmptyState = messages.length === 0;

  const memberSince = peerProfile?.created_at
    ? new Date(peerProfile.created_at).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
    : null;

  // Group messages by day
  const grouped: Array<{ day: string; msgs: Message[] }> = [];
  const dayMap = new Map<string, Message[]>();
  messages.forEach(m => {
    const day = new Date(m.createdAt).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    if (!dayMap.has(day)) dayMap.set(day, []);
    dayMap.get(day)!.push(m);
  });
  dayMap.forEach((msgs, day) => grouped.push({ day, msgs }));

  return (
    <div className="flex h-full flex-col w-full overflow-x-hidden">
      {/* User Profile Bar */}
      <div className="border-b border-gray-200 bg-white shrink-0">
        <div className="flex items-center justify-between p-3 md:p-4">
          {peerProfile && (
            <Link
              href={`/profile/${encodeURIComponent(peerProfile.name)}`}
              className="flex items-center gap-3 min-w-0 flex-1 hover:opacity-80 transition"
            >
              {peerProfile.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={peerProfile.avatar}
                  alt={displayName(peerProfile.name)}
                  className="h-12 w-12 rounded-full object-cover bg-gray-100 border-2 border-yellow-500"
                />
              ) : (
                <div className="h-12 w-12 rounded-full bg-yellow-500 flex items-center justify-center text-black font-bold text-lg border-2 border-yellow-600">
                  {(peerProfile.name || "?").slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-black truncate">
                    {displayName(peerProfile.name)}
                  </h2>
                  <User size={14} className="text-gray-400" />
                </div>
                {memberSince && (
                  <div className="flex items-center gap-1 text-xs text-gray-600">
                    <Calendar size={12} />
                    <span>Member since {memberSince}</span>
                  </div>
                )}
              </div>
            </Link>
          )}
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

      {/* Messages / Empty state */}
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto p-3 space-y-6 overscroll-contain"
      >
        {isRefreshing && (
          <div className="absolute top-2 right-3 text-[10px] text-gray-400 flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />
            Syncing…
          </div>
        )}
        {showEmptyState && !isRefreshing && (
          <div className="flex h-full items-center justify-center">
            <div className="text-xs text-gray-500 bg-gray-50 border border-gray-200 px-4 py-2 rounded-full">
              Conversation started. Send a message to begin.
            </div>
          </div>
        )}
        {!showEmptyState && grouped.map(group => (
          <div key={group.day}>
            <div className="sticky top-0 z-10 mb-2 flex justify-center">
              <span className="text-[10px] tracking-wide uppercase bg-gray-100 text-gray-600 px-2 py-1 rounded-full border border-gray-200">
                {group.day}
              </span>
            </div>
            <div className="space-y-2">
              {group.msgs.map(m => {
                const isMe = m.from.id === currentUserId;
                const ts = new Date(m.createdAt).toLocaleTimeString('en-GB', {
                  hour: '2-digit',
                  minute: '2-digit',
                });

                // Handle offer messages (placeholder for now - will integrate OfferMessage component)
                if (m.type === "offer") {
                  return (
                    <div key={m.id} className="px-0">
                      <div className="max-w-[90vw] sm:max-w-[78%] mx-auto">
                        <div className="px-3 py-2 rounded-lg border border-yellow-400 bg-yellow-50 text-sm">
                          Offer: £{((m.offer?.amountCents || 0) / 100).toFixed(2)} • {m.offer?.status}
                        </div>
                      </div>
                    </div>
                  );
                }

                // System messages
                if (m.type === "system") {
                  return (
                    <div key={m.id} className="flex justify-center px-0">
                      <div className="text-[11px] text-gray-500 bg-gray-50 px-3 py-1 rounded-full border border-gray-200">
                        {m.text}
                      </div>
                    </div>
                  );
                }

                // Regular text messages
                return (
                  <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} px-0`}>
                    <div className="max-w-[90vw] sm:max-w-[78%]">
                      <div className={`flex items-center gap-2 mb-0.5 ${isMe ? 'flex-row-reverse' : ''}`}>
                        <span className={`text-[10px] font-medium ${isMe ? 'text-right text-gray-500' : 'text-left text-gray-500'} truncate`}>
                          {displayName(m.from.name)}
                        </span>
                        <span className="text-[10px] text-gray-400 whitespace-nowrap">{ts}</span>
                      </div>
                      <div
                        className={`px-3 py-2 rounded-2xl border text-sm whitespace-pre-wrap break-words [overflow-wrap:anywhere] shadow-sm leading-relaxed ${
                          isMe
                            ? 'bg-yellow-500 text-black border-yellow-400 rounded-br-sm'
                            : 'bg-white text-gray-900 border-gray-200 rounded-bl-sm'
                        }`}
                      >
                        {m.text}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Composer */}
      <div className="border-t border-gray-200 p-3 bg-white shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const text = String(fd.get("text") || "");
            (e.currentTarget as HTMLFormElement).reset();
            handleSend(text);
          }}
          className="flex gap-2"
        >
          <input
            name="text"
            placeholder="Type a message"
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400"
            autoComplete="off"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <button className="rounded-md bg-gray-900 px-3 py-2 text-sm font-semibold text-white hover:bg-black">
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
