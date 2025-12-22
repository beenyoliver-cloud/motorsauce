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
    <div className="grid grid-cols-2 gap-3 rounded-2xl border border-gray-100 bg-white shadow-sm p-4 text-center">
      <div>
        <div className="text-xs uppercase text-gray-500">Followers</div>
        <div className="text-2xl font-semibold text-gray-900">{followers}</div>
      </div>
      <div>
        <div className="text-xs uppercase text-gray-500">Following</div>
        <div className="text-2xl font-semibold text-gray-900">{following}</div>
      </div>
    </div>
  );
}
