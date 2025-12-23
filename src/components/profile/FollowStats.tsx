"use client";

import { useEffect, useState } from "react";

type FollowStatsProps = {
  profileId?: string;
};

export default function FollowStats({ profileId }: FollowStatsProps) {
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);

  useEffect(() => {
    if (!profileId) return;
    fetch(`/api/profile/follow?profileId=${encodeURIComponent(profileId)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (typeof data.followers === "number") setFollowers(data.followers);
        if (typeof data.following === "number") setFollowing(data.following);
      })
      .catch((err) => console.error("[FollowStats] failed to load", err));
  }, [profileId]);

  return (
    <div className="flex items-center gap-4">
      <button className="hover:underline cursor-pointer">
        <span className="font-semibold text-gray-900">{followers}</span>
        <span className="text-gray-600 ml-1">followers</span>
      </button>
      <button className="hover:underline cursor-pointer">
        <span className="font-semibold text-gray-900">{following}</span>
        <span className="text-gray-600 ml-1">following</span>
      </button>
    </div>
  );
}
