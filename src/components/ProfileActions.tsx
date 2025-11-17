// src/components/ProfileActions.tsx
"use client";

import { useRouter } from "next/navigation";
import { MessageSquare, Share2 } from "lucide-react";
import { getCurrentUserSync } from "@/lib/auth";
import { createThread } from "@/lib/messagesClient";
import { useState } from "react";

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
  toUserId: initialUserId,
}: ProfileActionsProps) {
  const router = useRouter();
  const me = getCurrentUserSync();
  const [isLoading, setIsLoading] = useState(false);
  
  // Prevent self-messaging
  const isSelf = me?.id === initialUserId || me?.name === toUsername;

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

    setIsLoading(true);

    try {
      let userId = initialUserId;

      // If no user ID was provided, fetch it from the API
      if (!userId) {
        console.log("ProfileActions: No toUserId provided, fetching from API...");
        const res = await fetch(`/api/seller-profile?name=${encodeURIComponent(toUsername)}`);
        
        if (res.ok) {
          const data = await res.json();
          userId = data.id;
          console.log("ProfileActions: Fetched user ID:", userId);
        } else {
          console.error("ProfileActions: Failed to fetch user ID:", res.status);
          alert("Unable to message this user - user information is missing. Please try again.");
          setIsLoading(false);
          return;
        }
      }

      if (!userId) {
        console.error("ProfileActions: Still no userId after fetch attempt");
        alert("Unable to message this user - user not found. Please refresh the page and try again.");
        setIsLoading(false);
        return;
      }

      // Create or find thread with this user using new Supabase system
      const thread = await createThread(userId);
      
      if (!thread) {
        console.error("ProfileActions: Failed to create thread");
        alert("Unable to start conversation. Please try again or contact support.");
        setIsLoading(false);
        return;
      }

      router.push(`/messages/${encodeURIComponent(thread.id)}`);
    } catch (error) {
      console.error("ProfileActions: Error in handleMessage:", error);
      alert("Unable to start conversation. Please try again.");
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-row md:flex-col gap-2 w-full md:min-w-[120px]">
      <button
        type="button"
        onClick={handleMessage}
        disabled={isSelf || isLoading}
        className="flex-1 md:flex-none inline-flex items-center justify-center rounded-md px-3 py-2 bg-gray-900 text-white font-medium hover:bg-gray-800 text-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
        title={isSelf ? "You can't message yourself" : `Message ${toUsername}`}
      >
        <MessageSquare className="h-4 w-4 mr-2" /> 
        {isLoading ? "Loading..." : "Message"}
      </button>

      <button
        type="button"
        onClick={handleShare}
        className="flex-1 md:flex-none inline-flex items-center justify-center rounded-md px-3 py-2 bg-yellow-500 text-black font-semibold hover:bg-yellow-600 text-sm transition shadow-sm"
        title="Share profile"
      >
        <Share2 className="h-4 w-4 mr-2" /> Share
      </button>
    </div>
  );
}
