"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Edit3, Trash2, X } from "lucide-react";
import { Thread } from "@/lib/messagesClient";
import { getCurrentUser, type LocalUser } from "@/lib/auth";
import { displayName } from "@/lib/names";

type Props = { children: React.ReactNode };

type PeerItem = {
  threadId: string;
  name: string;
  last: string;
  lastTs: number;
  unread: boolean;
  avatar?: string;
  listing?: {
    id: string;
    title: string;
    image?: string | null;
  } | null;
};

function threadsToPeers(threads: Thread[]): PeerItem[] {
  return threads
    .map((t) => {
      const name = (t.peer?.name || "Unknown").toString();
      return {
        threadId: t.id,
        name,
        last: t.lastMessage || "",
        lastTs: new Date(t.lastMessageAt || 0).getTime(),
        unread: !t.isRead,
        avatar: t.peer?.avatar,
        listing: t.listing || null,
      };
    })
    .sort((a, b) => b.lastTs - a.lastTs);
}

export default function MessagesLayout({ children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [me, setMe] = useState<LocalUser | null>(null);
  const selfName = (me?.name || "You").trim();

  const [mounted, setMounted] = useState(false);
  const [peers, setPeers] = useState<PeerItem[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [selectedThreads, setSelectedThreads] = useState<Set<string>>(new Set());

  useEffect(() => {
    let alive = true;
    (async () => {
      const u = await getCurrentUser();
      if (!alive) return;
      setMe(u);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const activeId = useMemo(() => {
    const m = pathname?.match(/\/messages\/([^/?#]+)/);
    return m ? decodeURIComponent(m[1]) : "";
  }, [pathname]);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    const refresh = async () => {
      try {
        const res = await fetch("/api/messages/threads");
        if (!res.ok) throw new Error("Failed to fetch threads");
        const data = await res.json();
        setPeers(threadsToPeers(data));
      } catch (err) {
        console.error("Failed to refresh threads:", err);
      }
    };
    refresh();
    window.addEventListener("ms:threads", refresh as EventListener);
    window.addEventListener("ms:unread", refresh as EventListener);
    return () => {
      window.removeEventListener("ms:threads", refresh as EventListener);
      window.removeEventListener("ms:unread", refresh as EventListener);
    };
  }, [mounted]);

  function handleToggleThread(threadId: string) {
    setSelectedThreads(prev => {
      const next = new Set(prev);
      if (next.has(threadId)) {
        next.delete(threadId);
      } else {
        next.add(threadId);
      }
      return next;
    });
  }

  function handleDeleteSelected() {
    if (selectedThreads.size === 0) return;
    
    const confirmed = window.confirm(
      `Delete ${selectedThreads.size} conversation${selectedThreads.size > 1 ? 's' : ''}? This cannot be undone.`
    );
    
    if (!confirmed) return;

    // Delete threads via API
    selectedThreads.forEach(async (threadId) => {
      try {
        await fetch(`/api/messages/${threadId}`, { method: "DELETE" });
      } catch (err) {
        console.error("Failed to delete thread:", err);
      }
    });

    setSelectedThreads(new Set());
    // Refresh threads from API
    (async () => {
      try {
        const res = await fetch("/api/messages/threads");
        if (res.ok) {
          const data = await res.json();
          setPeers(threadsToPeers(data));
        }
      } catch (err) {
        console.error("Failed to refresh threads:", err);
      }
    })();
    setEditMode(false);
    
    // If current thread was deleted, navigate to messages home
    if (selectedThreads.has(activeId)) {
      router.push('/messages');
    }
  }

  function handleCancelEdit() {
    setEditMode(false);
    setSelectedThreads(new Set());
  }

  if (!mounted) {
    return (
      <section className="h-full">
        <main className="min-h-0">{children}</main>
      </section>
    );
  }

  return (
    <section className="h-full">
      <main className="min-h-0">{children}</main>
    </section>
  );
}
