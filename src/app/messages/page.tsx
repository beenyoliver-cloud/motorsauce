"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { fetchThreads, fetchMessages, sendMessage, markThreadRead, Thread, Message, updateOfferStatus } from "@/lib/messagesClient";
import { getCurrentUser, getCurrentUserSync } from "@/lib/auth";
import { analyzeMessageSafety } from "@/lib/messagingSafety";
import SellerLink from "@/components/SellerLink";
import { formatDistanceToNow } from "date-fns";
import { AlertCircle, AlertTriangle, ArrowLeft } from "lucide-react";

type ThreadWithMessages = {
  thread: Thread;
  messages: Message[];
};

function ThreadList({
  threads,
  selectedId,
  onSelect,
}: {
  threads: Thread[];
  selectedId?: string | null;
  onSelect: (id: string) => void;
}) {
  if (!threads.length) {
    return (
      <div className="p-4 text-sm text-slate-600">
        No conversations yet. Tap “Contact seller” or “Make offer” on a listing to start a chat.
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-100">
      {threads.map((t) => {
        const peerName = t.peer?.name || "Unknown";
        const last = t.lastMessage || "No messages yet";
        const time = t.lastMessageAt ? formatDistanceToNow(new Date(t.lastMessageAt), { addSuffix: true }) : "";
        const unread = t.needsReply || !t.isRead;
        return (
          <button
            key={t.id}
            onClick={() => onSelect(t.id)}
            className={`w-full text-left px-3 py-3 flex gap-3 hover:bg-slate-50 transition ${
              selectedId === t.id ? "bg-slate-100" : ""
            }`}
          >
            <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-sm font-semibold text-slate-700">
              {(peerName || "?").slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-sm text-slate-900 truncate">{peerName}</p>
                {time && <span className="text-xs text-slate-500 whitespace-nowrap">{time}</span>}
              </div>
              <p className="text-xs text-slate-600 line-clamp-1">{last}</p>
              {t.listing?.title && (
                <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{t.listing.title}</p>
              )}
            </div>
            {unread && <span className="h-2 w-2 rounded-full bg-amber-500 mt-1.5" />}
          </button>
        );
      })}
    </div>
  );
}

function MessageBubble({
  m,
  onOfferUpdate,
  currentUserId,
}: {
  m: Message;
  onOfferUpdate: (status: string, counter?: number) => Promise<void>;
  currentUserId: string;
}) {
  const me = getCurrentUserSync();
  const meId = currentUserId || me?.id || "";
  const isSystem = m.type === "system";
  const isOffer = m.type === "offer" && m.offer;
  const isOwn = !isSystem && !!meId && m.from.id === meId;
  const align = isSystem ? "items-center" : isOwn ? "items-end" : "items-start";
  const textBubbleClass = isOwn
    ? "max-w-[80%] rounded-lg border border-yellow-200 bg-yellow-100 px-3 py-2 text-sm text-gray-900 shadow-sm"
    : "max-w-[80%] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm";
  const timeClass = isOwn ? "text-yellow-700" : "text-slate-400";

  const canRespond =
    isOffer &&
    m.offer?.status === "pending" &&
    ((m.offer?.recipientId && m.offer.recipientId === meId) || (m.offer?.starterId && m.offer.starterId === meId));
  const showPayNow =
    isOffer &&
    m.offer?.status === "accepted" &&
    !!m.offer?.buyerId &&
    m.offer.buyerId === meId &&
    !!m.offer?.id;
  const offerId = m.offer?.id;
  const listingId = m.offer?.listingId;
  const listingTitle = m.offer?.listingTitle;
  const listingImage = m.offer?.listingImage;

  return (
    <div className={`flex flex-col ${align}`}>
      {isOffer ? (
        <div className="max-w-[80%] rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold">Offer</span>
            <span className="text-xs uppercase tracking-wide">{m.offer?.status}</span>
          </div>
          <div className="text-base font-bold">£{((m.offer?.amountCents || 0) / 100).toFixed(2)}</div>
          {(listingTitle || listingImage) && (
            listingId ? (
              <Link
                href={`/listing/${listingId}`}
                className="mt-2 flex items-center gap-2 rounded-md border border-amber-200 bg-white/70 p-2 hover:bg-white transition"
              >
                {listingImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={listingImage}
                    alt={listingTitle || "Listing"}
                    className="h-10 w-10 rounded object-cover border border-amber-100"
                  />
                ) : (
                  <div className="h-10 w-10 rounded bg-amber-100 border border-amber-200 flex items-center justify-center text-xs font-semibold text-amber-700">
                    Item
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-wide text-amber-700">Listing</p>
                  <p className="text-xs font-semibold text-amber-900 line-clamp-1">{listingTitle || "View listing"}</p>
                </div>
              </Link>
            ) : (
              <div className="mt-2 text-xs text-amber-800">
                {listingTitle}
              </div>
            )
          )}
          {canRespond && (
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              {m.offer?.recipientId === meId && (
                <>
                  <button
                    onClick={() => onOfferUpdate("accepted")}
                    className="rounded-md bg-emerald-500 text-white px-3 py-1 font-semibold hover:bg-emerald-600"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => onOfferUpdate("declined")}
                    className="rounded-md bg-slate-200 text-slate-800 px-3 py-1 font-semibold hover:bg-slate-300"
                  >
                    Decline
                  </button>
                </>
              )}
              {m.offer?.starterId === meId && (
                <button
                  onClick={() => onOfferUpdate("withdrawn")}
                  className="rounded-md bg-red-100 text-red-700 px-3 py-1 font-semibold hover:bg-red-200"
                >
                  Withdraw
                </button>
              )}
            </div>
          )}
          {showPayNow && offerId && (
            <div className="mt-2">
              <Link
                href={`/checkout?offer_id=${offerId}`}
                className="inline-flex items-center justify-center rounded-md bg-yellow-500 px-3 py-1.5 text-xs font-semibold text-black hover:bg-yellow-600"
              >
                Pay now
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className={textBubbleClass}>
          {m.text || "(no text)"}
        </div>
      )}
      <span className={`text-[11px] mt-1 ${timeClass}`}>{formatDistanceToNow(new Date(m.createdAt), { addSuffix: true })}</span>
    </div>
  );
}

function MessagePane({
  convo,
  onSend,
  onOfferUpdate,
  currentUserId,
  onBack,
}: {
  convo: ThreadWithMessages | null;
  onSend: (text: string) => Promise<void>;
  onOfferUpdate: (offerId: string, status: string) => Promise<void>;
  currentUserId: string;
  onBack?: () => void;
}) {
  const [text, setText] = useState("");
  const [safetyAnalysis, setSafetyAnalysis] = useState({ blockReason: null as string | null, warnings: [] as string[] });
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    setText("");
    setSafetyAnalysis({ blockReason: null, warnings: [] });
  }, [convo?.thread.id]);

  // Analyze safety as user types
  useEffect(() => {
    if (text) {
      setSafetyAnalysis(analyzeMessageSafety(text));
    } else {
      setSafetyAnalysis({ blockReason: null, warnings: [] });
    }
  }, [text]);

  if (!convo) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-slate-600">
        Select a conversation to view messages.
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col border border-slate-200 rounded-2xl bg-white shadow-sm">
      <div className="border-b border-slate-200 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="lg:hidden inline-flex items-center justify-center rounded-md border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50"
                aria-label="Back to conversations"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <div className="min-w-0">
            {convo.thread.peer?.name ? (
              <SellerLink
                sellerName={convo.thread.peer.name}
                sellerId={convo.thread.peer.id}
                className="text-sm font-semibold text-slate-900 hover:text-yellow-700"
              >
                {convo.thread.peer.name}
              </SellerLink>
            ) : (
              <p className="text-sm font-semibold text-slate-900">Conversation</p>
            )}
            {convo.thread.listing?.title && (
              <Link href={`/listing/${convo.thread.listingRef || convo.thread.listing?.id || ""}`} className="text-xs text-slate-600 hover:text-slate-900">
                {convo.thread.listing.title}
              </Link>
            )}
            </div>
          </div>
          <span className="text-[11px] uppercase tracking-wide text-slate-500">{convo.thread.type}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {convo.messages.length === 0 ? (
          <div className="text-sm text-slate-600">No messages yet. Say hello!</div>
        ) : (
          convo.messages.map((m) => (
            <MessageBubble
              key={m.id}
              m={m}
              currentUserId={currentUserId}
              onOfferUpdate={async (status) => {
                if (m.offer?.id) {
                  await onOfferUpdate(m.offer.id, status);
                }
              }}
            />
          ))
        )}
      </div>

      <form
        className="border-t border-slate-200 p-3 flex flex-col gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          const trimmed = text.trim();
          if (!trimmed || safetyAnalysis.blockReason) return;
          setIsSending(true);
          try {
            await onSend(trimmed);
            setText("");
            setSafetyAnalysis({ blockReason: null, warnings: [] });
          } finally {
            setIsSending(false);
          }
        }}
      >
        {/* Safety Block - Prevents sending */}
        {safetyAnalysis.blockReason && (
          <div className="rounded-lg border border-red-300 bg-red-50 p-2.5 flex gap-2 items-start">
            <AlertCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-red-700">
              <p className="font-semibold mb-0.5">Cannot send this message</p>
              <p>{safetyAnalysis.blockReason}</p>
            </div>
          </div>
        )}

        {/* Safety Warnings - Allows sending but alerts user */}
        {safetyAnalysis.warnings.length > 0 && !safetyAnalysis.blockReason && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-2.5 flex gap-2 items-start">
            <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-amber-700">
              <p className="font-semibold mb-1">Safety reminder:</p>
              <ul className="space-y-0.5">
                {safetyAnalysis.warnings.map((warning, idx) => (
                  <li key={idx}>• {warning}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Message..."
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
          />
          <button
            type="submit"
            disabled={!text.trim() || !!safetyAnalysis.blockReason || isSending}
            className="rounded-lg bg-amber-500 text-black font-semibold px-4 py-2 text-sm hover:bg-amber-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSending ? "Sending..." : "Send"}
          </button>
        </div>
      </form>
    </div>
  );
}

function MessagesPageInner() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messagesById, setMessagesById] = useState<Record<string, Message[]>>({});
  const [loadingThreads, setLoadingThreads] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [isDesktop, setIsDesktop] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;
    getCurrentUser()
      .then((user) => {
        if (isMounted) setCurrentUserId(user?.id || "");
      })
      .catch(() => {
        if (isMounted) setCurrentUserId("");
      });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const preselect = searchParams?.get("selected");
    setLoadingThreads(true);
    fetchThreads()
      .then((t) => {
        setThreads(t);
        const initial =
          preselect && t.find((th) => th.id === preselect)
            ? preselect
            : isDesktop
            ? t[0]?.id
            : null;
        if (initial && !selectedId) {
          setSelectedId(initial);
          markThreadRead(initial).then(() => window.dispatchEvent(new Event("ms:unread"))).catch(() => {});
        }
      })
      .finally(() => setLoadingThreads(false));
  }, [searchParams, isDesktop]);

  useEffect(() => {
    if (!selectedId) return;
    if (messagesById[selectedId]) return;
    setLoadingMessages(true);
    fetchMessages(selectedId)
      .then((m) => {
        setMessagesById((prev) => ({ ...prev, [selectedId]: m }));
        markThreadRead(selectedId).then(() => window.dispatchEvent(new Event("ms:unread"))).catch(() => {});
      })
      .finally(() => setLoadingMessages(false));
  }, [selectedId, messagesById]);

  const selectedConvo: ThreadWithMessages | null = useMemo(() => {
    if (!selectedId) return null;
    const thread = threads.find((t) => t.id === selectedId);
    if (!thread) return null;
    return { thread, messages: messagesById[selectedId] || [] };
  }, [selectedId, threads, messagesById]);

  const handleSend = async (text: string) => {
    if (!selectedId) return;
    await sendMessage(selectedId, text);
    const refreshed = await fetchMessages(selectedId);
    setMessagesById((prev) => ({
      ...prev,
      [selectedId]: refreshed,
    }));
    window.dispatchEvent(new Event("ms:unread"));
  };

  const handleOfferUpdate = async (offerId: string, status: string) => {
    try {
      const updated = await updateOfferStatus(offerId, status);
      if (!selectedId) return;
      setMessagesById((prev) => {
        const arr = prev[selectedId] || [];
        return {
          ...prev,
          [selectedId]: arr.map((m) =>
            m.offer?.id === offerId
              ? {
                  ...m,
                  offer: { ...m.offer, status: updated.status, amountCents: updated.amountCents, currency: updated.currency },
                }
              : m
          ),
        };
      });
      // Refresh threads to update badges
      const refreshed = await fetchThreads();
      setThreads(refreshed);
      markThreadRead(selectedId).catch(() => {});
      window.dispatchEvent(new Event("ms:unread"));
      router.replace(`/messages?selected=${selectedId}`);
    } catch (err) {
      console.error("[messages] Failed to update offer:", err);
      alert(err instanceof Error ? err.message : "Failed to update offer");
    }
  };

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_2fr] gap-4 sm:gap-5">
          <div
            className={`rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden ${
              selectedId ? "hidden lg:block" : "block"
            }`}
          >
            <div className="px-3 py-3 border-b border-gray-200">
              <h1 className="text-lg font-bold">Messages</h1>
            </div>
            {loadingThreads ? (
              <div className="p-4 text-sm text-slate-600">Loading conversations…</div>
            ) : (
              <ThreadList
                threads={threads}
                selectedId={selectedId}
                onSelect={(id) => {
                  setSelectedId(id);
                  router.replace(`/messages?selected=${id}`);
                }}
              />
            )}
          </div>

          <div className={`min-h-[400px] ${selectedId ? "block" : "hidden"} lg:block`}>
            {loadingMessages && !selectedConvo ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-600">Loading messages…</div>
            ) : (
              <MessagePane
                convo={selectedConvo}
                onSend={handleSend}
                onOfferUpdate={handleOfferUpdate}
                currentUserId={currentUserId}
                onBack={() => {
                  setSelectedId(null);
                  router.replace("/messages");
                }}
              />
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white text-slate-700 flex items-center justify-center">Loading messages…</div>}>
      <MessagesPageInner />
    </Suspense>
  );
}
