"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { fetchThreads, fetchMessages, sendMessage, markThreadRead, Thread, Message, updateOfferStatus } from "@/lib/messagesClient";
import { getCurrentUserSync } from "@/lib/auth";
import { formatDistanceToNow } from "date-fns";

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

function MessageBubble({ m, onOfferUpdate }: { m: Message; onOfferUpdate: (status: string, counter?: number) => Promise<void> }) {
  const me = getCurrentUserSync();
  const meId = me?.id || "";
  const isSystem = m.type === "system";
  const isOffer = m.type === "offer" && m.offer;

  const canRespond =
    isOffer &&
    m.offer?.status === "pending" &&
    ((m.offer?.recipientId && m.offer.recipientId === meId) || (m.offer?.starterId && m.offer.starterId === meId));

  return (
    <div className={`flex flex-col ${isSystem ? "items-center" : ""}`}>
      {isOffer ? (
        <div className="max-w-[80%] rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold">Offer</span>
            <span className="text-xs uppercase tracking-wide">{m.offer?.status}</span>
          </div>
          <div className="text-base font-bold">£{((m.offer?.amountCents || 0) / 100).toFixed(2)}</div>
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
        </div>
      ) : (
        <div className="max-w-[80%] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm">
          {m.text || m.body || "(no text)"}
        </div>
      )}
      <span className="text-[11px] text-slate-400 mt-1">{formatDistanceToNow(new Date(m.createdAt), { addSuffix: true })}</span>
    </div>
  );
}

function MessagePane({
  convo,
  onSend,
  onOfferUpdate,
}: {
  convo: ThreadWithMessages | null;
  onSend: (text: string) => Promise<void>;
  onOfferUpdate: (offerId: string, status: string) => Promise<void>;
}) {
  const [text, setText] = useState("");
  useEffect(() => {
    setText("");
  }, [convo?.thread.id]);

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
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">{convo.thread.peer?.name || "Conversation"}</p>
            {convo.thread.listing?.title && (
              <Link href={`/listing/${convo.thread.listingRef || convo.thread.listing?.id || ""}`} className="text-xs text-slate-600 hover:text-slate-900">
                {convo.thread.listing.title}
              </Link>
            )}
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
        className="border-t border-slate-200 p-3 flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const trimmed = text.trim();
          if (!trimmed) return;
          onSend(trimmed).then(() => setText(""));
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Message..."
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
        />
        <button
          type="submit"
          className="rounded-lg bg-amber-500 text-black font-semibold px-4 py-2 text-sm hover:bg-amber-400 transition"
        >
          Send
        </button>
      </form>
    </div>
  );
}

export default function MessagesPage() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messagesById, setMessagesById] = useState<Record<string, Message[]>>({});
  const [loadingThreads, setLoadingThreads] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const preselect = searchParams?.get("selected");
    setLoadingThreads(true);
    fetchThreads()
      .then((t) => {
        setThreads(t);
        const initial = preselect && t.find((th) => th.id === preselect) ? preselect : t[0]?.id;
        if (initial && !selectedId) {
          setSelectedId(initial);
          markThreadRead(initial).then(() => window.dispatchEvent(new Event("ms:unread"))).catch(() => {});
        }
      })
      .finally(() => setLoadingThreads(false));
  }, [searchParams]);

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
    const sent = await sendMessage(selectedId, text);
    setMessagesById((prev) => ({
      ...prev,
      [selectedId]: [...(prev[selectedId] || []), sent],
    }));
    window.dispatchEvent(new Event("ms:unread"));
  };

  const handleOfferUpdate = async (offerId: string, status: string) => {
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
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-6xl px-3 sm:px-4 lg:px-6 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_2fr] gap-4 sm:gap-5">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-3 py-3 border-b border-slate-200">
              <h1 className="text-lg font-bold">Messages</h1>
            </div>
            {loadingThreads ? (
              <div className="p-4 text-sm text-slate-600">Loading conversations…</div>
            ) : (
              <ThreadList threads={threads} selectedId={selectedId} onSelect={(id) => { setSelectedId(id); }} />
            )}
          </div>

          <div className="min-h-[400px]">
            {loadingMessages && !selectedConvo ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-600">Loading messages…</div>
            ) : (
              <MessagePane convo={selectedConvo} onSend={handleSend} onOfferUpdate={handleOfferUpdate} />
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
