"use client";

import { useCallback, useEffect, useState } from "react";
import { Heart, Loader2 } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase";

type FollowButtonProps = {
  profileId?: string;
  profileName: string;
  initialIsFollowing?: boolean;
  onChange?: (next: boolean) => void;
};

export default function FollowButton({ profileId, profileName, initialIsFollowing = false, onChange }: FollowButtonProps) {
  const [loading, setLoading] = useState(false);
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [canInteract, setCanInteract] = useState(false);

  useEffect(() => {
    setIsFollowing(initialIsFollowing);
  }, [initialIsFollowing]);

  useEffect(() => {
    (async () => {
      const supabase = supabaseBrowser();
      const { data: { user } } = await supabase.auth.getUser();
      if (user && user.id !== profileId) {
        setCanInteract(true);
      }
    })();
  }, [profileId]);

  const toggleFollow = useCallback(async () => {
    if (!profileId || loading) return;
    setLoading(true);
    try {
      const nextState = !isFollowing;
      const res = await fetch("/api/profile/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId, action: nextState ? "follow" : "unfollow" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update follow state");
      }
      setIsFollowing(nextState);
      onChange?.(nextState);
    } catch (err) {
      console.error("[FollowButton] toggle failed", err);
      alert(err instanceof Error ? err.message : "Failed to update follow state");
    } finally {
      setLoading(false);
    }
  }, [isFollowing, loading, onChange, profileId]);

  if (!profileId || !canInteract) {
    return null;
  }

  return (
    <button
      onClick={toggleFollow}
      disabled={loading}
      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition border ${
        isFollowing
          ? "bg-black text-white border-black hover:bg-gray-900"
          : "bg-white text-gray-900 border-gray-300 hover:border-gray-900"
      } disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Heart className={`h-4 w-4 ${isFollowing ? "fill-current" : ""}`} />
      )}
      {isFollowing ? "Following" : "Follow"}
    </button>
  );
}
