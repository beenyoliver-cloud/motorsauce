// src/components/ThreadClient.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  upsertThreadForPeer,
  Thread,
  slugify,
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

  // Peer profile data
  const [peerProfile, setPeerProfile] = useState<PeerProfile | null>(null);

  // Only load threads AFTER mount (so server & client initial HTML match)
  const [threads, setThreads] = useState<Thread[]>([]);
  const [reconstructing, setReconstructing] = useState(false);
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

  // If thread doesn't exist on first load, try to reconstruct it from threadId
  useEffect(() => {
    if (!mounted || thread || !threadId) return;

    setReconstructing(true);

    // Parse threadId format: t_{name1}_{name2} or t_{name1}_{name2}_{listingRef}
    const match = threadId.match(/^t_([^_]+)_([^_]+)(?:_(.+))?$/);
    if (!match) { setReconstructing(false); return; }

    const [, slug1, slug2, listingRef] = match;

    // Determine which name is self and which is peer
    const selfSlug = slugify(selfName);

    let peerSlug: string | null = null;
    if (slug1 === selfSlug) peerSlug = slug2;
    else if (slug2 === selfSlug) peerSlug = slug1;

    const fetchAndCreateThread = async () => {
      try {
        const supabase = supabaseBrowser();

        // If we couldn't determine who "self" is yet (e.g., selfName not hydrated),
        // try to hydrate and recompute once.
        if (!peerSlug) {
          try {
            const { getCurrentUser } = await import("@/lib/auth");
            const u = await getCurrentUser();
            if (u?.name) {
              const s2 = slugify(u.name);
              if (slug1 === s2) peerSlug = slug2;
              else if (slug2 === s2) peerSlug = slug1;
            }
          } catch {}
        }

        // If still unknown, default to assuming slug2 is peer.
        if (!peerSlug) peerSlug = slug2;

        // Try to find a profile that matches this slug pattern
        const { data: profiles } = await supabase
          .from('profiles')
          .select('name, email')
          .ilike('name', `%${peerSlug.replace(/-/g, '%')}%`)
          .limit(10);

        if (!profiles || profiles.length === 0) {
          // Fallback: create with nicer-spaced slug as name
          const peerName = peerSlug
            .split('-')
            .map(w => w ? w.charAt(0).toUpperCase() + w.slice(1) : '')
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim();

          upsertThreadForPeer(selfName, peerName || peerSlug, {
            preferThreadId: threadId,
            initialLast: "New conversation",
            listingRef: listingRef || undefined,
          });
          setThreads(loadThreads());
          return;
        }

        // Find the profile whose slug matches exactly
        const peerProfile = profiles.find(p => slugify(p.name) === peerSlug) || profiles[0];

        // Create thread with proper peerId (email)
        upsertThreadForPeer(selfName, peerProfile.name, {
          preferThreadId: threadId,
          initialLast: "New conversation",
          listingRef: listingRef || undefined,
          peerId: peerProfile.email,
        });
        setThreads(loadThreads());
      } finally {
        setReconstructing(false);
      }
    };

    fetchAndCreateThread();
  }, [mounted, thread, threadId, selfName]);

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
        {reconstructing ? (
          <div className="text-sm text-gray-700">Restoring conversation…</div>
        ) : (
          <>
            <div className="text-sm text-gray-700">
              This conversation was removed or doesn’t exist.
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

  const memberSince = peerProfile?.created_at 
    ? new Date(peerProfile.created_at).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
    : null;

  const scrollRef = useRef<HTMLDivElement | null>(null);
  // auto-scroll on new messages if near bottom
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !thread) return;
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 120;
    if (atBottom) {
      requestAnimationFrame(() => { el.scrollTop = el.scrollHeight; });
    }
  }, [thread?.messages.length]);

  // Group messages by day
  const grouped = useMemo((): Array<{ day: string; msgs: Thread["messages"] }> => {
    if (!thread) return [];
    const map = new Map<string, Thread["messages"]>();
    thread.messages.forEach((m) => {
      const day = new Date(m.ts || Date.now()).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(m);
    });
    return Array.from(map.entries()).map(([day, msgs]) => ({ day, msgs }));
  }, [thread]);

  return (
    <div className="flex h-full flex-col w-full max-w-screen-sm mx-auto overflow-x-hidden">
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
                className="site-image h-12 w-12 rounded-full bg-gray-100 border-2 border-yellow-500 object-cover"
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
  <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-6 overscroll-contain">
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
                      key={m._k || m.id}
                      msg={{
                        id: m.id || '',
                        threadId: thread.id,
                        type: 'offer',
                        offer: m.offer ? {
                          ...m.offer,
                          currency: m.offer.currency ?? 'GBP',
                          status: (m.offer.status === 'started'
                            ? 'pending'
                            : m.offer.status === 'expired'
                            ? 'withdrawn'
                            : m.offer.status) as 'pending' | 'accepted' | 'declined' | 'countered' | 'withdrawn',
                          listingId: (m.offer.listingId ?? '') as string | number,
                        } : undefined,
                      }}
                      currentUser={selfName}
                    />
                  );
                }
                const mineMsg = (m.from || '').trim() === selfName.trim();
                const ts = new Date(m.ts || Date.now()).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
                return (
                  <div key={m._k || m.id} className={`flex ${mineMsg ? 'justify-end' : 'justify-start'} px-0`}>
                    <div className="max-w-[90vw] sm:max-w-[78%]">
                      <div className={`flex items-center gap-2 mb-0.5 ${mineMsg ? 'flex-row-reverse' : ''}`}>
                        <span className={`text-[10px] font-medium ${mineMsg ? 'text-right text-gray-500' : 'text-left text-gray-500'} truncate`}>{displayName(m.from || 'Unknown')}</span>
                        <span className="text-[10px] text-gray-400 whitespace-nowrap">{ts}</span>
                      </div>
                      <div className={`px-3 py-2 rounded-2xl border text-sm whitespace-pre-wrap break-words [overflow-wrap:anywhere] shadow-sm leading-relaxed ${mineMsg ? 'bg-yellow-500 text-black border-yellow-400 rounded-br-sm' : 'bg-white text-gray-900 border-gray-200 rounded-bl-sm'}`}>{m.text}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Composer */}
      <div className="border-t border-gray-200 p-3 sticky bottom-0 bg-white">
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
