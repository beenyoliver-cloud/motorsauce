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
    if (!profileId) return;
    let active = true;
    fetch(`/api/profile/follow?profileId=${encodeURIComponent(profileId)}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        if (typeof data.isFollowing === "boolean") {
          setIsFollowing(data.isFollowing);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [profileId]);

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
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("ms:follow", {
            detail: { profileId, delta: nextState ? 1 : -1, isFollowing: nextState },
          })
        );
      }
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
          ? "bg-yellow-100 text-yellow-900 border-yellow-300 hover:bg-yellow-200"
          : "bg-yellow-500 text-black border-yellow-500 hover:bg-yellow-600"
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
