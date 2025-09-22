"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  loadThreads,
  getReadThreads,
  publishUnread,
  Thread,
} from "@/lib/chatStore";
import { getCurrentUser } from "@/lib/auth";
import { displayName } from "@/lib/names";

type Props = { children: React.ReactNode };

type PeerItem = {
  threadId: string;
  name: string;
  last: string;
  lastTs: number;
  unread: boolean;
  avatar?: string;
};

function threadsToPeers(threads: Thread[], readIds: string[]): PeerItem[] {
  const read = new Set(readIds);
  return threads
    .map((t) => {
      const name = (t.peer || "Unknown").toString();
      const unread = t.messages.length > 0 && !read.has(t.id);
      return {
        threadId: t.id,
        name,
        last: t.last || "",
        lastTs: t.lastTs || 0,
        unread,
        avatar: t.peerAvatar,
      };
    })
    .sort((a, b) => b.lastTs - a.lastTs);
}

export default function MessagesLayout({ children }: Props) {
  const pathname = usePathname();
  const me = getCurrentUser();
  const selfName = (me?.name || "You").trim();

  const [mounted, setMounted] = useState(false);
  const [peers, setPeers] = useState<PeerItem[]>([]);

  const activeId = useMemo(() => {
    const m = pathname?.match(/\/messages\/([^/?#]+)/);
    return m ? decodeURIComponent(m[1]) : "";
  }, [pathname]);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    const refresh = () => {
      const ts = loadThreads();
      const r = getReadThreads();
      setPeers(threadsToPeers(ts, r));
      publishUnread(ts, r);
    };
    refresh();
    window.addEventListener("ms:threads", refresh as EventListener);
    window.addEventListener("storage", refresh as EventListener);
    return () => {
      window.removeEventListener("ms:threads", refresh as EventListener);
      window.removeEventListener("storage", refresh as EventListener);
    };
  }, [mounted]);

  if (!mounted) {
    return (
      <section className="h-full grid grid-cols-[280px_1fr]">
        <aside className="border-r border-gray-200 p-3 space-y-2">
          <div className="h-6 w-32 rounded bg-gray-200 animate-pulse" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 rounded bg-gray-50 border border-gray-200 animate-pulse" />
          ))}
        </aside>
        <main>{children}</main>
      </section>
    );
  }

  return (
    <section className="h-full grid grid-cols-[280px_1fr]">
      <aside className="border-r border-gray-200 p-3">
        <div className="mb-2 text-xs text-gray-600">Signed in as</div>
        <div className="mb-4 text-sm font-semibold text-black">{displayName(selfName)}</div>

        <div className="mb-2 text-xs font-semibold text-gray-700">Conversations</div>
        <nav className="space-y-1">
          {peers.length === 0 ? (
            <div className="text-sm text-gray-600">No conversations yet.</div>
          ) : (
            peers.map((p) => {
              const isActive = p.threadId === activeId;
              return (
                <Link
                  key={p.threadId}
                  href={`/messages/${encodeURIComponent(p.threadId)}`}
                  className={`flex items-center gap-2 rounded-md px-2 py-2 transition ${
                    isActive ? "bg-gray-900 text-white" : "hover:bg-gray-50"
                  }`}
                >
                  {p.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.avatar} alt="" className="h-8 w-8 rounded-full object-cover bg-gray-100" />
                  ) : (
                    <div
                      className={`h-8 w-8 rounded-full ${
                        isActive ? "bg-white text-black" : "bg-yellow-500 text-black"
                      } flex items-center justify-center text-[11px] font-bold`}
                    >
                      {(p.name || "?").slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <div className={`truncate text-sm ${isActive ? "font-semibold" : "text-black"}`}>
                        {displayName(p.name || "Unknown")}
                      </div>
                      {p.unread && !isActive && <span className="ml-2 h-2 w-2 rounded-full bg-yellow-500" />}
                    </div>
                    <div className={`truncate text-xs ${isActive ? "text-gray-200" : "text-gray-600"}`}>
                      {p.last || "\\u00A0"}
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
