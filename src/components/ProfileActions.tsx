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
    console.log("ProfileActions: handleMessage called", {
      toUsername,
      initialUserId,
      meId: me.id,
      meName: me.name
    });

    try {
      let userId = initialUserId;

      // If no user ID was provided, fetch it from the API
      if (!userId) {
        console.log("ProfileActions: No toUserId provided, fetching from API for:", toUsername);
        
        try {
          const res = await fetch(`/api/seller-profile?name=${encodeURIComponent(toUsername)}`);
          console.log("ProfileActions: API response status:", res.status);
          
          if (res.ok) {
            const data = await res.json();
            console.log("ProfileActions: API response data:", data);
            userId = data.id;
            
            if (!userId) {
              console.error("ProfileActions: API returned data but no ID field:", data);
              alert("Unable to message this user - user ID not found in response. Please try again.");
              setIsLoading(false);
              return;
            }
            
            console.log("ProfileActions: Successfully fetched user ID:", userId);
          } else {
            const errorText = await res.text();
            console.error("ProfileActions: Failed to fetch user ID:", res.status, errorText);
            // Fallback: try direct Supabase browser query
            try {
              console.log("ProfileActions: Attempting Supabase direct lookup fallback...");
              const { supabaseBrowser } = await import("@/lib/supabase");
              const supabase = supabaseBrowser();
              const { data, error } = await supabase
                .from("profiles")
                .select("id")
                .eq("name", toUsername)
                .single();
              if (error || !data?.id) {
                console.error("ProfileActions: Supabase direct lookup failed", error);
                alert(`Unable to message this user - lookup failed (${res.status}). Please try again later.`);
                setIsLoading(false);
                return;
              }
              userId = data.id;
              console.log("ProfileActions: Fallback Supabase lookup succeeded with id:", userId);
            } catch (supErr) {
              console.error("ProfileActions: Fallback Supabase lookup exception", supErr);
              alert(`Unable to message this user - internal error. Please try again.`);
              setIsLoading(false);
              return;
            }
          }
        } catch (fetchError) {
          console.error("ProfileActions: Fetch error:", fetchError);
          alert("Unable to message this user - network error. Please check your connection and try again.");
          setIsLoading(false);
          return;
        }
      } else {
        console.log("ProfileActions: Using provided userId:", userId);
      }

      if (!userId) {
        console.error("ProfileActions: Still no userId after all attempts");
        alert("Unable to message this user - user not found. Please refresh the page and try again.");
        setIsLoading(false);
        return;
      }

      console.log("ProfileActions: Creating thread with userId:", userId);
      
      // Create or find thread with this user using new Supabase system
      const thread = await createThread(userId);
      
      if (!thread) {
        console.error("ProfileActions: createThread returned null/undefined");
        // Error already shown by createThread function
        setIsLoading(false);
        return;
      }

      console.log("ProfileActions: Thread created successfully:", thread.id);
      router.push(`/messages/${encodeURIComponent(thread.id)}`);
    } catch (error) {
      console.error("ProfileActions: Unexpected error in handleMessage:", error);
      alert(`Unexpected error: ${error instanceof Error ? error.message : "Please try again"}`);
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
