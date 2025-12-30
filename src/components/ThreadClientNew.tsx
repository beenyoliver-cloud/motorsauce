// src/components/ThreadClientNew.tsx
"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, Calendar, Trash2, Mail, ShieldAlert, ShoppingBag, Shield } from "lucide-react";
import {
  fetchMessages,
  sendMessage,
  markThreadRead,
  markThreadUnread,
  deleteThread as apiDeleteThread,
  createThread,
  Message,
} from "@/lib/messagesClient";
import { getCurrentUser } from "@/lib/auth";
import { displayName } from "@/lib/names";
import { supabaseBrowser } from "@/lib/supabase";
import OfferCard from "@/components/OfferCard";
import { ReviewMessage } from "@/components/ReviewMessage";
import { analyzeMessageSafety } from "@/lib/messagingSafety";

const QUICK_REPLIES = [
  "Thanks for reaching out! This part is still available.",
  "Happy to arrange collection or courier - let me know what works for you.",
  "Can you share your reg or VIN so I can double-check fitment?",
  "I'll send an offer through Motorsource so we're both protected.",
];

type PeerProfile = {
  id: string;
  name: string;
  email: string;
  created_at: string;
  avatar?: string;
  account_type?: string | null;
  business_verified?: boolean;
  total_sales?: number | null;
  avg_response_time_minutes?: number | null;
  response_rate?: number | null;
};

type ThreadListing = {
  id: string;
  title: string;
  price?: number | string | null;
  image?: string | null;
  category?: string | null;
  location?: string | null;
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
  const [threadListing, setThreadListing] = useState<ThreadListing | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<string>("");
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [hasHadMessages, setHasHadMessages] = useState(false);
  const [peerId, setPeerId] = useState<string | null>(null);
  const [listingRef, setListingRef] = useState<string | null>(null);
  const draftKey = `ms_thread_draft:${threadId}`;
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const headerRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLDivElement | null>(null);
  const [viewportAdjustedHeight, setViewportAdjustedHeight] = useState<string | null>(null);
  const isSendingRef = useRef(false); // Prevent polling during send
  const threadMetaFetched = useRef(false);
  const safetyInsights = useMemo(() => analyzeMessageSafety(draft), [draft]);
  const isBlockedBySafety = Boolean(safetyInsights.blockReason);
  const historyWarnings = useMemo(() => {
    const warnings = new Set<string>();
    messages.forEach((m) => {
      if (m.text) {
        const res = analyzeMessageSafety(m.text);
        res.warnings.forEach((w) => warnings.add(w));
        if (res.blockReason) warnings.add(res.blockReason);
      }
    });
    return Array.from(warnings);
  }, [messages]);

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
          if (messages.length > 0) setIsRefreshing(true);
        }
        const msgs = await fetchMessages(threadId);
        if (!active) return;
        
        // Check if we have new messages and enable auto-scroll if user is near bottom
        const hasNewMessages = msgs.length > messages.length;
        if (hasNewMessages && !initial) {
          console.log("[ThreadClientNew] New messages detected, count now:", msgs.length);
          const el = scrollRef.current;
          if (el) {
            const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 120;
            if (atBottom) {
              setShouldAutoScroll(true);
              console.log("[ThreadClientNew] User at bottom, enabling auto-scroll for new messages");
            }
          }
        }
        
        setMessages(msgs);
        if (msgs.length > 0) setHasHadMessages(true);

        // Derive peer from messages if any
        let peerId = msgs.find(m => m.from.id !== currentUserId)?.from.id;

        // Load thread metadata (participants/listing) once
        if (!threadMetaFetched.current) {
          const { data: threadRow, error: threadErr } = await supabase
            .from("threads")
            .select("participant_1_id, participant_2_id, listing_ref")
            .eq("id", threadId)
            .single();
          if (!threadErr && threadRow) {
            threadMetaFetched.current = true;
            const { participant_1_id, participant_2_id, listing_ref } = threadRow as any;
            if (!peerId && participant_1_id && participant_2_id) {
              peerId = participant_1_id === currentUserId ? participant_2_id : participant_1_id;
            }
            if (peerId) setPeerId(peerId);
            if (listing_ref) setListingRef(listing_ref);
            if (listing_ref && !threadListing) {
              const { data: listingData } = await supabase
                .from("listings")
                .select("id, title, price, images, category, location")
                .eq("id", listing_ref)
                .single();
              if (listingData) {
                const image =
                  Array.isArray(listingData.images) && listingData.images.length > 0
                    ? listingData.images[0]?.url || listingData.images[0]
                    : null;
                setThreadListing({
                  id: listingData.id,
                  title: listingData.title,
                  price: listingData.price,
                  image,
                  category: listingData.category ?? null,
                  location: listingData.location ?? null,
                });
              }
            }
          }
        }

        if (peerId) {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("id, name, email, created_at, avatar, account_type, business_verified, total_sales, avg_response_time_minutes, response_rate")
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

  // Auto-scroll on new messages with smart detection
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || messages.length === 0) return;
    
    // Always scroll on initial load or when shouldAutoScroll is enabled
    if (shouldAutoScroll || !hasHadMessages) {
      requestAnimationFrame(() => { 
        el.scrollTop = el.scrollHeight;
        console.log("[ThreadClientNew] Auto-scrolling to bottom (count:", messages.length, "had:", hasHadMessages, ")");
      });
    }
  }, [messages.length, shouldAutoScroll, hasHadMessages]);

  // Track if user has scrolled up manually
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    
    const handleScroll = () => {
      const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 50;
      setShouldAutoScroll(atBottom);
      console.log("[ThreadClientNew] Scroll position updated - at bottom:", atBottom);
    };
    
    el.addEventListener('scroll', handleScroll);
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

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
  // Mobile bottom tab bar removed; no extra bottom reservation
  const tabBarH = 0;
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
    if (safetyInsights.blockReason) {
      setSendError(safetyInsights.blockReason);
      return;
    }
    setSendError(null);
    setIsSending(true);
    isSendingRef.current = true; // Block polling during send
    try {
      const sent = await sendMessage(threadId, text.trim(), { peerId, listingRef });
      if (sent) {
        setMessages(prev => [...prev, sent]);
        setDraft("");
        // Enable auto-scroll for sent messages
        setShouldAutoScroll(true);
        console.log("[ThreadClientNew] Message sent, enabling auto-scroll");
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
      const msg = err?.message || "";
      if (msg.includes("Thread not found") && peerId) {
        try {
          const newThread = await createThread(peerId, listingRef || undefined);
          if (newThread?.id) {
            router.push(`/messages/${encodeURIComponent(newThread.id)}`);
            return;
          }
        } catch (createErr) {
          console.error("[ThreadClientNew] failed to recreate thread", createErr);
        }
      }
      setSendError(msg || "Failed to send message");
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
    ? new Date(peerProfile.created_at).toLocaleDateString("en-GB", { month: "long", year: "numeric" })
    : null;

  const formatPrice = (price: ThreadListing["price"]) => {
    if (price === null || price === undefined) return null;
    if (typeof price === "number") {
      return `£${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    const trimmed = price.toString().trim();
    return trimmed.startsWith("£") ? trimmed : `£${trimmed}`;
  };

  const handleQuickReply = (reply: string) => {
    setDraft(reply);
    setSendError(null);
  };

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

      {(peerProfile || threadListing) && (
        <div className="border-b border-gray-100 bg-gray-50 px-3 py-3 md:px-4 grid gap-3 md:grid-cols-2">
          {peerProfile && (
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Shield className={`h-4 w-4 ${peerProfile.business_verified ? "text-green-600" : "text-gray-400"}`} />
                <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Buyer profile</p>
              </div>
              <div className="text-sm text-gray-900 font-semibold truncate">{displayName(peerProfile.name)}</div>
              <dl className="grid grid-cols-2 gap-3 text-xs text-gray-600">
                <div>
                  <dt className="uppercase tracking-widest text-[10px] text-gray-400">Sales</dt>
                  <dd className="text-sm font-semibold text-gray-900">{peerProfile.total_sales ?? "—"}</dd>
                </div>
                <div>
                  <dt className="uppercase tracking-widest text-[10px] text-gray-400">Response rate</dt>
                  <dd className="text-sm font-semibold text-gray-900">
                    {peerProfile.response_rate ? `${peerProfile.response_rate}%` : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="uppercase tracking-widest text-[10px] text-gray-400">Avg. reply</dt>
                  <dd className="text-sm font-semibold text-gray-900">
                    {peerProfile.avg_response_time_minutes ? `${peerProfile.avg_response_time_minutes}m` : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="uppercase tracking-widest text-[10px] text-gray-400">Account</dt>
                  <dd className="text-sm font-semibold text-gray-900">
                    {peerProfile.account_type === "business" ? "Business" : "Individual"}
                  </dd>
                </div>
              </dl>
            </div>
          )}
          {threadListing && (
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden">
                {threadListing.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={threadListing.image} alt={threadListing.title} className="h-full w-full object-cover" />
                ) : (
                  <ShoppingBag className="h-5 w-5 text-gray-500" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{threadListing.title}</p>
                {formatPrice(threadListing.price) && (
                  <p className="text-xs text-gray-600">{formatPrice(threadListing.price)}</p>
                )}
                <p className="text-[11px] text-gray-500 truncate">
                  {threadListing.category || "Parts"} {threadListing.location ? `• ${threadListing.location}` : ""}
                </p>
                <Link
                  href={`/listing/${threadListing.id}`}
                  className="text-[11px] font-semibold text-yellow-700 hover:text-yellow-900"
                >
                  View listing →
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Messages / Empty state */}
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto p-3 space-y-6 overscroll-contain"
        style={viewportAdjustedHeight ? { height: viewportAdjustedHeight } : undefined}
      >
        {historyWarnings.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 flex items-start gap-2">
            <ShieldAlert className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold">Safety reminder</p>
              {historyWarnings.map((w) => (
                <p key={w}>{w}</p>
              ))}
              <p className="text-[11px] text-amber-800">Keep chat and payments on Motorsource for protection.</p>
            </div>
          </div>
        )}
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
                  const offerRecipientId = m.offer.recipientId || null;
                  const offerSellerId = m.offer.sellerId || null;
                  const isRecipient = offerRecipientId === currentUserId;
                  const isCurrentUserSeller = offerSellerId
                    ? offerSellerId === currentUserId
                    : isRecipient;

                  return (
                    <div key={m.id} className="px-0 py-1">
                      <div className="max-w-[90vw] sm:max-w-md mx-auto">
                        <OfferCard
                          offerId={m.offer.id}
                          amount={m.offer.amountCents}
                          currency={m.offer.currency}
                          status={m.offer.status}
                          listingId={m.offer.listingId}
                          listingTitle={m.offer.listingTitle}
                          listingImage={m.offer.listingImage}
                          listingPrice={m.offer.listingPrice}
                          isCurrentUserSeller={isCurrentUserSeller}
                          isRecipient={isRecipient}
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
                  // Parse system message to add icons and formatting
                  let icon = "ℹ️";
                  let bgColor = "bg-blue-50";
                  let textColor = "text-blue-700";
                  let borderColor = "border-blue-200";
                  
                  if (m.text?.includes("accepted")) {
                    icon = "";
                    bgColor = "bg-green-50";
                    textColor = "text-green-700";
                    borderColor = "border-green-200";
                  } else if (m.text?.includes("declined")) {
                    icon = "";
                    bgColor = "bg-red-50";
                    textColor = "text-red-700";
                    borderColor = "border-red-200";
                  } else if (m.text?.includes("countered")) {
                    icon = "";
                    bgColor = "bg-yellow-50";
                    textColor = "text-yellow-700";
                    borderColor = "border-yellow-200";
                  } else if (m.text?.includes("withdrawn")) {
                    icon = "";
                    bgColor = "bg-gray-100";
                    textColor = "text-gray-700";
                    borderColor = "border-gray-300";
                  } else if (m.text?.includes("Conversation started")) {
                    icon = "";
                    bgColor = "bg-purple-50";
                    textColor = "text-purple-700";
                    borderColor = "border-purple-200";
                  }
                  
                  return (
                    <div key={m.id} className="flex justify-center px-0 my-2">
                      <div className={`text-[12px] font-medium ${textColor} ${bgColor} px-3 py-2 rounded-full border ${borderColor} flex items-center gap-2 shadow-sm`}>
                        {icon && <span className="text-base">{icon}</span>}
                        <span>{m.text}</span>
                      </div>
                    </div>
                  );
                }

                // Review messages
                if (m.type === "review" && m.review) {
                  return (
                    <div key={m.id} className="px-0 py-1">
                      <div className="max-w-[90vw] sm:max-w-md mx-auto">
                        <ReviewMessage review={m.review} isMe={isMe} />
                      </div>
                    </div>
                  );
                }

                // Regular text messages
                return (
                  <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} px-0`}>
                    <div className="max-w-[88vw] sm:max-w-[78%]">
                      <div className={`flex items-center gap-2 mb-0.5 ${isMe ? 'flex-row-reverse' : ''}`}>
                        <span className={`text-[11px] font-semibold ${isMe ? 'text-right text-gray-600' : 'text-left text-gray-600'} truncate`}>
                          {displayName(m.from.name)}
                        </span>
                        <span className="text-[10px] text-gray-400 whitespace-nowrap">{ts}</span>
                      </div>
                      <div
                        className={`px-3 py-2.5 rounded-2xl text-sm whitespace-pre-wrap break-words [overflow-wrap:anywhere] leading-relaxed shadow ${
                          isMe
                            ? 'bg-gray-900 text-white rounded-br-sm'
                            : 'bg-gray-100 text-gray-900 rounded-bl-sm'
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
      <div ref={composerRef} className="border-t border-gray-200 p-2 sm:p-3 bg-white shrink-0">
        <div className="mb-2 flex gap-2 overflow-x-auto sm:flex-wrap sm:overflow-visible pb-1">
          {QUICK_REPLIES.map((reply) => (
            <button
              key={reply}
              type="button"
              onClick={() => handleQuickReply(reply)}
              className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] sm:text-xs text-gray-600 hover:border-yellow-400 hover:text-yellow-800 transition whitespace-nowrap"
            >
              {reply}
            </button>
          ))}
        </div>
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
              disabled={isSending || !draft.trim() || isBlockedBySafety}
              className="rounded-md bg-gray-900 px-3 py-2 text-sm font-semibold text-white hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSending && (
                <span className="inline-block h-2 w-2 rounded-full bg-yellow-400 animate-pulse" />
              )}
              {isSending ? "Sending…" : "Send"}
            </button>
          </div>
          {(safetyInsights.blockReason || safetyInsights.warnings.length > 0) && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              <ShieldAlert className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                {safetyInsights.blockReason && (
                  <p className="font-semibold">{safetyInsights.blockReason}</p>
                )}
                {safetyInsights.warnings.map((w) => (
                  <p key={w}>{w}</p>
                ))}
                {!safetyInsights.blockReason && (
                  <p className="text-[11px] text-amber-800">
                    Keep payments and chat inside Motorsource so we can help if something goes wrong.
                  </p>
                )}
              </div>
            </div>
          )}
          {sendError && (
            <div className="text-xs text-red-600" role="alert" aria-live="polite">{sendError}</div>
          )}
        </form>
      </div>
    </div>
  );
}
