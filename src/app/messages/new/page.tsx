"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { getCurrentUser } from "@/lib/auth";

function slugify(x: string) {
  return x.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export default function NewMessageRouter() {
  const router = useRouter();
  const sp = useSearchParams();

  useEffect(() => {
    const me = getCurrentUser();
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
    <section className="mx-auto max-w-6xl px-4 py-10">
      <div className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-700">
        Creating conversation…
      </div>
    </section>
  );
}
