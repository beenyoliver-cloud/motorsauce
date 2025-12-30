// src/components/ProfileActions.tsx
"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { MessageSquare, Share2 } from "lucide-react";
import { getCurrentUserSync } from "@/lib/auth";
import { createThread } from "@/lib/messagesClient";
import { useState } from "react";

type ProfileActionsProps = {
  shareText: string;
  shareUrl: string;
  toUsername: string;
  toUserId?: string; // Supabase user ID for creating threads
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
        try {
          const res = await fetch(`/api/seller-profile?name=${encodeURIComponent(toUsername)}`);
          if (res.ok) {
            const data = await res.json();
            userId = data.id;
            if (!userId) {
              alert("Unable to message this user - user ID not found in response. Please try again.");
              setIsLoading(false);
              return;
            }
          } else {
            // Fallback: try direct Supabase browser query
            try {
              const { supabaseBrowser } = await import("@/lib/supabase");
              const supabase = supabaseBrowser();
              const { data, error } = await supabase
                .from("profiles")
                .select("id")
                .eq("name", toUsername)
                .single();
              if (error || !data?.id) {
                alert(`Unable to message this user - lookup failed (${res.status}). Please try again later.`);
                setIsLoading(false);
                return;
              }
              userId = data.id;
            } catch (supErr) {
              alert(`Unable to message this user - internal error. Please try again.`);
              setIsLoading(false);
              return;
            }
          }
        } catch {
          alert("Unable to message this user - network error. Please check your connection and try again.");
          setIsLoading(false);
          return;
        }
      }

      if (!userId) {
        alert("Unable to message this user - user not found. Please refresh the page and try again.");
        setIsLoading(false);
        return;
      }

      // Create or find thread with this user using new Supabase system
      const thread = await createThread(userId);
      if (!thread) {
        // Error already shown by createThread function
        setIsLoading(false);
        return;
      }

      const params = new URLSearchParams();
      params.set("peer", userId);
      router.push(`/messages/${encodeURIComponent(thread.id)}?${params.toString()}`);
    } catch (error) {
      alert(`Unexpected error: ${error instanceof Error ? error.message : "Please try again"}`);
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 w-full md:min-w-[120px]">
      {isSelf ? (
        <Link
          href="/settings"
          className="w-full inline-flex items-center justify-center rounded-md px-3 py-2 bg-gray-900 text-white font-medium hover:bg-gray-800 text-sm transition"
        >
          Edit account
        </Link>
      ) : (
        <button
          type="button"
          onClick={handleMessage}
          disabled={isLoading}
          className="w-full inline-flex items-center justify-center rounded-md px-3 py-2 bg-gray-900 text-white font-medium hover:bg-gray-800 text-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
          title={`Message ${toUsername}`}
        >
          <MessageSquare className="h-4 w-4 mr-2" />
          {isLoading ? "Loading..." : "Message"}
        </button>
      )}

      <button
        type="button"
        onClick={handleShare}
        className="w-full inline-flex items-center justify-center rounded-md px-3 py-2 bg-yellow-500 text-black font-semibold hover:bg-yellow-600 text-sm transition shadow-sm"
        title="Share profile"
      >
        <Share2 className="h-4 w-4 mr-2" /> Share
      </button>
    </div>
  );
}
