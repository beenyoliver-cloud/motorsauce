// src/components/ProfileActions.tsx
"use client";

import { useRouter } from "next/navigation";
import { MessageSquare, Share2 } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { slugify, upsertThreadForPeer } from "@/lib/chatStore";

type ProfileActionsProps = {
  shareText: string;
  shareUrl: string;
  toUsername: string;        // e.g. "OliverB"
  toUserEmail: string;       // STABLE peerId (required) e.g. "beenyoliver@gmail.com"
};

export default function ProfileActions({
  shareText,
  shareUrl,
  toUsername,
  toUserEmail,               // ← required: we pass this as peerId
}: ProfileActionsProps) {
  const router = useRouter();

  async function handleShare() {
    try {
      if (navigator.share) {
        await navigator.share({ title: shareText, text: shareText, url: shareUrl });
        return;
      }
      await navigator.clipboard.writeText(shareUrl);
    } catch {}
  }

  function handleMessage() {
    const me = getCurrentUser();
    const selfName = (me?.name || "You").trim();

    // direct profile chat (no listingRef)
    const threadId = `t_${slugify(selfName)}_${slugify(toUsername)}`;

    // Ensure the thread exists with *email* peerId
    upsertThreadForPeer(selfName, toUsername, {
      preferThreadId: threadId,
      initialLast: "New conversation",
      peerId: toUserEmail, // ← stable peer id (email)
    });

    router.push(`/messages/${encodeURIComponent(threadId)}`);
  }

  return (
    <div className="flex flex-col gap-2 min-w-[120px]">
      <button
        type="button"
        onClick={handleMessage}
        className="inline-flex items-center justify-center rounded-md px-3 py-2 bg-gray-900 text-white font-medium hover:bg-gray-800 text-sm transition"
        title={`Message ${toUsername}`}
      >
        <MessageSquare className="h-4 w-4 mr-2" /> Message
      </button>

      <button
        type="button"
        onClick={handleShare}
        className="inline-flex items-center justify-center rounded-md px-3 py-2 bg-yellow-500 text-black font-semibold hover:bg-yellow-600 text-sm transition shadow-sm"
        title="Share profile"
      >
        <Share2 className="h-4 w-4 mr-2" /> Share
      </button>
    </div>
  );
}
