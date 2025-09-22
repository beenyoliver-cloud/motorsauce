"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadThreads } from "@/lib/chatStore";

export default function MessagesIndex() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [empty, setEmpty] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const go = () => {
      const threads = loadThreads().sort((a, b) => b.lastTs - a.lastTs);
      if (cancelled) return;
      if (threads.length > 0) {
        router.replace(`/messages/${encodeURIComponent(threads[0].id)}`);
      } else {
        setEmpty(true);
      }
      setChecked(true);
    };
    go();
    const onStorage = () => go();
    window.addEventListener("storage", onStorage);
    window.addEventListener("ms:offers", onStorage as EventListener);
    window.addEventListener("ms:unread", onStorage as EventListener);
    return () => {
      cancelled = true;
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("ms:offers", onStorage as EventListener);
      window.removeEventListener("ms:unread", onStorage as EventListener);
    };
  }, [router]);

  if (!checked) return <div className="p-6 text-sm text-gray-600">Loading conversations…</div>;
  if (empty) return <div className="p-6 text-sm text-gray-600">Select a conversation from the left.</div>;
  return null;
}
