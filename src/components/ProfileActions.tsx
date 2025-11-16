// src/components/ProfileActions.tsx
"use client";

import { useRouter } from "next/navigation";
import { MessageSquare, Share2 } from "lucide-react";
import { getCurrentUserSync } from "@/lib/auth";
import { createThread } from "@/lib/messagesClient";

type ProfileActionsProps = {
  shareText: string;
  shareUrl: string;
  toUsername: string;
  toUserId?: string;  // Supabase user ID for creating threads
};

export default function ProfileActions({
  shareText,
  shareUrl,
  toUsername,
  toUserId,
}: ProfileActionsProps) {
  const router = useRouter();
  const me = getCurrentUserSync();
  
  // Prevent self-messaging
  const isSelf = me?.id === toUserId || me?.name === toUsername;

  async function handleShare() {
    try {
      if (navigator.share) {
        await navigator.share({ title: shareText, text: shareText, url: shareUrl });
        return;
      }
      await navigator.clipboard.writeText(shareUrl);
    } catch {}
  }

  async function handleMessage() {
    if (!me) {
      router.push(`/auth/login?next=/profile/${encodeURIComponent(toUsername)}`);
      return;
    }

    if (!toUserId) {
      console.warn("ProfileActions: No toUserId provided for messaging");
      return;
    }

    // Create or find thread with this user using new Supabase system
    const thread = await createThread(toUserId);
    
    if (!thread) {
      console.error("Failed to create thread");
      return;
    }

    router.push(`/messages/${encodeURIComponent(thread.id)}`);
  }

  return (
    <div className="flex flex-col gap-2 min-w-[120px]">
      <button
        type="button"
        onClick={handleMessage}
        disabled={isSelf}
        className="inline-flex items-center justify-center rounded-md px-3 py-2 bg-gray-900 text-white font-medium hover:bg-gray-800 text-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
        title={isSelf ? "You can't message yourself" : `Message ${toUsername}`}
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
