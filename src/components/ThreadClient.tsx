// src/components/ThreadClient.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, Trash2 } from "lucide-react";
import ActiveOfferBar from "@/components/ActiveOfferBar";
import OfferMessage from "@/components/OfferMessage";
import {
  fetchMessages,
  fetchThreads,
  sendMessage,
  markThreadRead,
  type Message,
  type Thread as ThreadType,
} from "@/lib/messagesClient";
import { getCurrentUserSync, getCurrentUser } from "@/lib/auth";
import { displayName } from "@/lib/names";

export default function ThreadClient({
  threadId,
  forceOfferToast = false,
}: {
  threadId: string;
  forceOfferToast?: boolean;
}) {
  const router = useRouter();
  const meInitial = getCurrentUserSync();
  const [selfName, setSelfName] = useState<string>(meInitial?.name?.trim() || "You");

  // --- Hydration-safe: render a stable skeleton until mounted
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Hydrate current user so cache is set and name/id become available
  useEffect(() => {
    (async () => {
      if (!mounted) return;
      try {
        const { getCurrentUser } = await import("@/lib/auth");
        const u = await getCurrentUser();
        if (u?.name) setSelfName(u.name.trim());
      } catch {}
    })();
  }, [mounted]);

  // API-based messages and thread data
  const [messages, setMessages] = useState<Message[]>([]);
  const [thread, setThread] = useState<ThreadType | null>(null);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  
  // Fetch thread metadata and messages from API
  const fetchAndSetData = async () => {
    if (!mounted || !threadId) return;
    try {
      setMessagesError(null);
      
      // Fetch all threads to find the specific one
      const threads = await fetchThreads();
      const foundThread = threads.find(t => t.id === threadId);
      setThread(foundThread || null);
      
      // Fetch messages for this thread
      const msgs = await fetchMessages(threadId);
      setMessages(msgs);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to load messages";
      console.error("[ThreadClient] Error fetching data:", err);
      setMessagesError(errorMsg);
    }
  };

  // Load data when threadId changes
  useEffect(() => {
    if (!mounted || !threadId) return;
    setMessagesLoading(true);
    (async () => {
      await fetchAndSetData();
      setMessagesLoading(false);
    })();
  }, [mounted, threadId]);

  // Mark thread as read when opened
  useEffect(() => {
    if (!mounted || !thread) return;
    
    (async () => {
      try {
        await markThreadRead(thread.id);
        // Trigger unread count update
        window.dispatchEvent(new Event('ms:unread'));
      } catch (err) {
        console.error("[ThreadClient] Failed to mark thread as read:", err);
      }
    })();
  }, [mounted, thread?.id]);

  // Poll for new messages every 3 seconds
  useEffect(() => {
    if (!mounted || !threadId) return;
    
    const interval = setInterval(async () => {
      try {
        const msgs = await fetchMessages(threadId);
        // Update if count changed or if latest message is newer
        const hasNewMessages = msgs.length > messages.length || 
          (msgs.length > 0 && messages.length > 0 && 
           new Date(msgs[msgs.length - 1]?.createdAt || 0) > 
           new Date(messages[messages.length - 1]?.createdAt || 0));
        
        if (hasNewMessages) {
          setMessages(msgs);
          console.log("[ThreadClient] New messages detected, count now:", msgs.length);
          // Enable auto-scroll for new messages if user is near bottom
          const el = scrollRef.current;
          if (el) {
            const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 120;
            if (atBottom) {
              setShouldAutoScroll(true);
              console.log("[ThreadClient] User at bottom, enabling auto-scroll for new messages");
            }
          }
          // Trigger unread count update
          window.dispatchEvent(new Event('ms:unread'));
        }
      } catch (err) {
        console.error("[ThreadClient] Polling error:", err);
      }
    }, 3000);
    
    return () => clearInterval(interval);
  }, [mounted, threadId, messages.length]);

  // Auto-scroll when messages change
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    
    // Always auto-scroll when messages first load or when shouldAutoScroll is true
    if (shouldAutoScroll || messages.length <= 5) {
      requestAnimationFrame(() => { 
        el.scrollTop = el.scrollHeight;
        console.log("[ThreadClient] Auto-scrolling to bottom (count:", messages.length, "should:", shouldAutoScroll, ")");
      });
    } else {
      // Check if user is near bottom, if so, auto-scroll
      const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 120;
      if (atBottom) {
        requestAnimationFrame(() => { el.scrollTop = el.scrollHeight; });
        console.log("[ThreadClient] User at bottom, scrolling to latest");
      }
    }
  }, [messages.length, shouldAutoScroll]);

  // Scroll to bottom on initial load
  useEffect(() => {
    if (messagesLoading) return;
    const el = scrollRef.current;
    if (el && messages.length > 0) {
      requestAnimationFrame(() => { 
        el.scrollTop = el.scrollHeight;
        setShouldAutoScroll(false);
        console.log("[ThreadClient] Initial load complete, scrolled to bottom");
      });
    }
  }, [messagesLoading]);

  // Track if user has scrolled up manually
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    
    const handleScroll = () => {
      const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 50;
      setShouldAutoScroll(atBottom);
      if (atBottom) {
        console.log("[ThreadClient] User scrolled to bottom, auto-scroll enabled");
      } else {
        console.log("[ThreadClient] User scrolled up, auto-scroll disabled");
      }
    };
    
    el.addEventListener('scroll', handleScroll);
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

  // Group messages by day
  const grouped = useMemo((): Array<{ day: string; msgs: Message[] }> => {
    const map = new Map<string, Message[]>();
    messages.forEach((m) => {
      const day = new Date(m.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(m);
    });
    return Array.from(map.entries()).map(([day, msgs]) => ({ day, msgs }));
  }, [messages]);

  // Send message to thread
  async function send(text: string) {
    if (!text.trim() || !thread) return;
    try {
      const msg = await sendMessage(thread.id, text);
      if (msg) {
        setMessages([...messages, msg]);
        // Enable auto-scroll for sent messages
        setShouldAutoScroll(true);
        console.log("[ThreadClient] Message sent, enabling auto-scroll");
        // Trigger unread count update in case reply comes in
        window.dispatchEvent(new Event('ms:unread'));
      }
    } catch (err) {
      console.error("[ThreadClient] Failed to send message:", err);
    }
  }

  // Delete thread (navigate back)
  function handleDelete() {
    if (!thread) return;
    router.push("/messages");
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
        {messagesLoading ? (
          <div className="text-sm text-gray-700">Loading conversation…</div>
        ) : (
          <>
            <div className="text-sm text-gray-700">
              This conversation doesn&apos;t exist or was removed.
            </div>
            <Link
              href="/messages"
              className="mt-2 inline-block text-sm text-gray-900 underline"
            >
              Back to messages
            </Link>
          </>
        )}
      </div>
    );
  }

  const peerName = thread.peer.name;
  const peerAvatar = thread.peer.avatar;

  return (
    <div className="flex h-full flex-col w-full max-w-screen-sm mx-auto overflow-x-hidden">
      {/* User Profile Bar */}
      <div className="border-b border-gray-200 bg-white shrink-0">
        <div className="flex items-center justify-between p-4">
          <Link 
            href={`/profile/${encodeURIComponent(peerName)}`}
            className="flex items-center gap-3 min-w-0 flex-1 hover:opacity-80 transition"
          >
            <div className="h-12 w-12 rounded-full overflow-hidden bg-gray-100 border-2 border-yellow-500 shrink-0">
            {peerAvatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img 
                src={peerAvatar} 
                alt={peerName}
                className="site-image"
              />
            ) : (
              <div className="w-full h-full bg-yellow-500 flex items-center justify-center text-black font-bold text-lg">
                {(peerName || "?").slice(0, 2).toUpperCase()}
              </div>
            )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-black truncate">
                  {displayName(peerName)}
                </h2>
                <User size={14} className="text-gray-400" />
              </div>
              {thread.listing && (
                <div className="text-xs text-gray-500 truncate mt-0.5">
                  About: {thread.listing.title || `Listing #${thread.listingRef}`}
                </div>
              )}
            </div>
          </Link>
          <button
            onClick={handleDelete}
            className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition"
            title="Back to messages"
          >
            <Trash2 size={16} />
            Back
          </button>
        </div>
      </div>

      {/* Active offer bar (shows accept/decline/counter to the recipient only) */}
      <ActiveOfferBar threadId={thread.id} />

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-6 overscroll-contain min-h-0">
        {grouped.map(group => (
          <div key={group.day}>
            <div className="sticky top-0 z-10 mb-2 flex justify-center">
              <span className="text-[10px] tracking-wide uppercase bg-gray-100 text-gray-600 px-2 py-1 rounded-full border border-gray-200">{group.day}</span>
            </div>
            <div className="space-y-2">
              {group.msgs.map(m => {
                if (m.type === 'offer') {
                  return (
                    <OfferMessage
                      key={m.id}
                      msg={{
                        id: m.id,
                        threadId: thread.id,
                        type: 'offer',
                        offer: m.offer ? {
                          ...m.offer,
                          currency: m.offer.currency ?? 'GBP',
                          status: m.offer.status as 'pending' | 'accepted' | 'declined' | 'countered' | 'withdrawn',
                          listingId: m.offer.listingId || '',
                          starterId: m.offer.starterId ?? undefined,
                          recipientId: m.offer.recipientId ?? undefined,
                          buyerId: m.offer.buyerId ?? undefined,
                          sellerId: m.offer.sellerId ?? undefined,
                        } : undefined,
                      }}
                      currentUser={selfName}
                    />
                  );
                }
                const mineMsg = (m.from?.name || '').trim() === selfName.trim();
                const ts = new Date(m.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
                return (
                  <div key={m.id} className={`flex ${mineMsg ? 'justify-end' : 'justify-start'} px-0`}>
                    <div className="max-w-[90vw] sm:max-w-[78%]">
                      <div className={`flex items-center gap-2 mb-0.5 ${mineMsg ? 'flex-row-reverse' : ''}`}>
                        <span className={`text-[10px] font-medium ${mineMsg ? 'text-right text-gray-500' : 'text-left text-gray-500'} truncate`}>{displayName(m.from?.name || 'Unknown')}</span>
                        <span className="text-[10px] text-gray-400 whitespace-nowrap">{ts}</span>
                      </div>
                      <div className={`px-3 py-2 rounded-sm border text-sm whitespace-pre-wrap break-words [overflow-wrap:anywhere] shadow-sm leading-relaxed ${mineMsg ? 'bg-yellow-500 text-black border-yellow-400 rounded-br-sm' : 'bg-white text-gray-900 border-gray-200 rounded-bl-sm'}`}>{m.text}</div>
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
            send(text);
          }}
          className="flex gap-2"
        >
          <input
            name="text"
            placeholder="Type a message"
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400"
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
