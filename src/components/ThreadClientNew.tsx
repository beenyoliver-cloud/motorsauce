// src/components/ThreadClientNew.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, Calendar, Trash2, Mail } from "lucide-react";
import {
  fetchMessages,
  sendMessage,
  markThreadRead,
  markThreadUnread,
  deleteThread as apiDeleteThread,
  Message,
} from "@/lib/messagesClient";
import { getCurrentUser } from "@/lib/auth";
import { displayName } from "@/lib/names";
import { supabaseBrowser } from "@/lib/supabase";
import OfferCard from "@/components/OfferCard";

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
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [hasHadMessages, setHasHadMessages] = useState(false);
  const draftKey = `ms_thread_draft:${threadId}`;
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const headerRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLDivElement | null>(null);
  const [viewportAdjustedHeight, setViewportAdjustedHeight] = useState<string | null>(null);
  const isSendingRef = useRef(false); // Prevent polling during send

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
        // Skip polling refresh if user is sending a message
        if (!initial && isSendingRef.current) {
          return;
        }
        
        if (initial) {
          setIsInitialLoading(true);
        } else {
          setIsRefreshing(true);
        }
        const msgs = await fetchMessages(threadId);
        if (!active) return;
  setMessages(msgs);
  if (msgs.length > 0) setHasHadMessages(true);

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

  // Dynamic height calculation for mobile to avoid header + bottom bar overlap
  useEffect(() => {
    if (!mounted) return;
    function compute() {
      const isMobile = window.innerWidth < 768; // md breakpoint
      if (!isMobile) {
        setViewportAdjustedHeight(null);
        return;
      }
      const headerH = headerRef.current?.offsetHeight || 0;
      const composerH = composerRef.current?.offsetHeight || 0;
      // Mobile tab bar estimated height (from MobileTabBar ~56px)
      const tabBarH = 56;
      const safeBottom = Number.parseInt(getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-bottom)')) || 0;
      const totalOffset = headerH + composerH + tabBarH + safeBottom;
      const h = Math.max(window.innerHeight - totalOffset, 200); // clamp minimum
      setViewportAdjustedHeight(`${h}px`);
    }
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, [mounted]);

  async function handleSend(text: string) {
    if (!text.trim() || isSending) return;
    setSendError(null);
    setIsSending(true);
    isSendingRef.current = true; // Block polling during send
    try {
      const sent = await sendMessage(threadId, text.trim());
      if (sent) {
        setMessages(prev => [...prev, sent]);
        setDraft("");
        // Force immediate refresh after send to ensure message appears
        setTimeout(() => {
          isSendingRef.current = false;
        }, 1000); // Small delay to let server process
      } else {
        setSendError("Message failed to send. Please try again.");
        isSendingRef.current = false;
      }
    } catch (err: any) {
      console.error("[ThreadClientNew] send error", err);
      setSendError(err.message || "Failed to send message");
      isSendingRef.current = false;
    } finally {
      setIsSending(false);
    }
  }

  async function handleDelete() {
    const success = await apiDeleteThread(threadId);
    if (success) {
      router.push("/messages");
    }
  }

  async function handleMarkUnread() {
    const success = await markThreadUnread(threadId);
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
  const showEmptyState = messages.length === 0 && !hasHadMessages;

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
  <div ref={headerRef} className="border-b border-gray-200 bg-white shrink-0">
        <div className="flex items-center justify-between p-3 md:p-4">
          {peerProfile && (
            <Link
              href={`/profile/${encodeURIComponent(peerProfile.name)}`}
              className="flex items-center gap-3 min-w-0 flex-1 hover:opacity-80 transition"
            >
              <div className="h-12 w-12 rounded-full overflow-hidden bg-gray-100 border-2 border-yellow-500 shrink-0">
              {peerProfile.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={peerProfile.avatar}
                  alt={displayName(peerProfile.name)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-yellow-500 flex items-center justify-center text-black font-bold text-lg">
                  {(peerProfile.name || "?").slice(0, 2).toUpperCase()}
                </div>
              )}
              </div>
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
          <div className="flex gap-2">
            <button
              onClick={handleMarkUnread}
              className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition"
              title="Mark as unread (eBay-style)"
            >
              <Mail size={16} />
              <span className="hidden sm:inline">Unread</span>
            </button>
            <button
              onClick={handleDelete}
              className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition"
              title="Delete this conversation (only for you)"
            >
              <Trash2 size={16} />
              <span className="hidden sm:inline">Delete</span>
            </button>
          </div>
        </div>
      </div>

      {/* Messages / Empty state */}
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto p-3 space-y-6 overscroll-contain"
        style={viewportAdjustedHeight ? { height: viewportAdjustedHeight } : undefined}
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

                // Handle offer messages with interactive card
                if (m.type === "offer" && m.offer) {
                  // Determine if current user is the seller (recipient of offer)
                  const isCurrentUserSeller = m.from.id !== currentUserId;
                  
                  return (
                    <div key={m.id} className="px-0 py-1">
                      <div className="max-w-[90vw] sm:max-w-md mx-auto">
                        <OfferCard
                          offerId={m.offer.id}
                          amount={m.offer.amountCents}
                          currency={m.offer.currency}
                          status={m.offer.status}
                          isCurrentUserSeller={isCurrentUserSeller}
                          onUpdate={async () => {
                            // Refresh messages after offer update
                            const msgs = await fetchMessages(threadId);
                            setMessages(msgs);
                          }}
                        />
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
  <div ref={composerRef} className="border-t border-gray-200 p-3 bg-white shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend(draft);
          }}
          className="flex flex-col gap-2"
        >
          <div className="flex gap-2">
            <input
              name="text"
              placeholder="Type a message"
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 disabled:opacity-50"
              autoComplete="off"
              value={draft}
              onChange={(e) => { setDraft(e.target.value); if (sendError) setSendError(null); }}
              disabled={isSending}
            />
            <button
              type="submit"
              disabled={isSending || !draft.trim()}
              className="rounded-md bg-gray-900 px-3 py-2 text-sm font-semibold text-white hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSending && (
                <span className="inline-block h-2 w-2 rounded-full bg-yellow-400 animate-pulse" />
              )}
              {isSending ? "Sending…" : "Send"}
            </button>
          </div>
          {sendError && (
            <div className="text-xs text-red-600" role="alert" aria-live="polite">{sendError}</div>
          )}
        </form>
      </div>
    </div>
  );
}
