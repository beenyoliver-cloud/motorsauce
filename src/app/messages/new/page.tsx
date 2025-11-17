"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  appendMessage,
  getReadThreads,
  nowClock,
  publishUnread,
  setReadThreads,
  Thread,
  upsertThreadForPeer,
  loadThreads,
} from "@/lib/chatStore";
import { getCurrentUserSync } from "@/lib/auth";

function slugify(x: string) {
  return x.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export default function NewMessageRouter() {
  const router = useRouter();
  const [sp, setSp] = useState(() => new URLSearchParams(typeof window !== 'undefined' ? window.location.search : ""));

  useEffect(() => {
    const onPop = () => setSp(new URLSearchParams(window.location.search));
    window.addEventListener("popstate", onPop as EventListener);
    return () => window.removeEventListener("popstate", onPop as EventListener);
  }, []);

  useEffect(() => {
    const me = getCurrentUserSync();
    const selfName = me?.name?.trim() || "You";
    const to = (sp.get("to") || "").trim();
    const body = (sp.get("body") || "").trim();
    const ref = (sp.get("ref") || "").trim();

    if (!to) {
      router.replace("/messages");
      return;
    }
    if (to.toLowerCase() === selfName.toLowerCase()) {
      router.replace("/messages?err=self");
      return;
    }

    const preferThreadId = ref ? `t_${slugify(selfName)}_${slugify(to)}_${ref}` : undefined;

    const thread: Thread = upsertThreadForPeer(selfName, to, {
      preferThreadId,
      initialLast: body || "New conversation",
    });

    const currentRead = getReadThreads();
    if (!currentRead.includes(thread.id)) {
      const next = [...currentRead, thread.id];
      setReadThreads(next);
      publishUnread(loadThreads(), next);
    }

    if (body) {
      appendMessage(thread.id, {
        id: `m_${Date.now()}`,
        from: selfName,
        text: body,
        ts: nowClock(),
      });
    }

    router.replace(`/messages/${encodeURIComponent(thread.id)}`);
  }, [router, sp]);

  return (
    <section className="page-center px-4 py-16">
      <div className="max-w-md mx-auto rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-700 shadow-sm text-center">
        Creating conversation…
      </div>
    </section>
  );
}
