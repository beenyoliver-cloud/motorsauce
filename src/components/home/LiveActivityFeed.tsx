"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Activity, Package, CheckCircle2 } from "lucide-react";

type ActivityItem = {
  id: string;
  type: "listing" | "sale";
  title: string;
  sellerName: string;
  sellerId: string;
  timestamp: string;
  image?: string;
};

function timeAgo(timestamp: string): string {
  const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
  
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default function LiveActivityFeed() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    async function fetchActivity() {
      try {
        const res = await fetch("/api/activity", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          setActivities(data);
        }
      } catch {
        // Silently fail
      } finally {
        setLoading(false);
      }
    }

    fetchActivity();
    // Refresh every 60 seconds
    const interval = setInterval(fetchActivity, 60000);
    return () => clearInterval(interval);
  }, []);

  // Cycle through activities every 4 seconds
  useEffect(() => {
    if (activities.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activities.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [activities.length]);

  if (loading) {
    return (
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl p-4 shadow-lg animate-pulse">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-4 h-4 bg-gray-700 rounded" />
          <div className="w-24 h-3 bg-gray-700 rounded" />
        </div>
        <div className="space-y-3">
          <div className="h-12 bg-gray-700/50 rounded" />
          <div className="h-12 bg-gray-700/50 rounded" />
        </div>
      </div>
    );
  }
  
  if (activities.length === 0) {
    return (
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl p-4 shadow-lg">
        <div className="flex items-center gap-2 mb-3">
          <div className="relative">
            <Activity className="h-4 w-4 text-green-400" />
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 bg-green-400 rounded-full animate-pulse" />
          </div>
          <span className="text-xs font-semibold text-green-400 uppercase tracking-wide">Live Activity</span>
        </div>
        <p className="text-sm text-gray-400 text-center py-4">
          No recent activity yet
        </p>
      </div>
    );
  }

  const current = activities[currentIndex];

  return (
    <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl p-4 shadow-lg">
      <div className="flex items-center gap-2 mb-3">
        <div className="relative">
          <Activity className="h-4 w-4 text-green-400" />
          <span className="absolute -top-0.5 -right-0.5 h-2 w-2 bg-green-400 rounded-full animate-pulse" />
        </div>
        <span className="text-xs font-semibold text-green-400 uppercase tracking-wide">Live Activity</span>
      </div>

      <div className="space-y-2 min-h-[80px]">
        <div
          key={current.id}
          className="flex items-start gap-3 transition-opacity duration-300"
        >
          <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
            current.type === "sale" 
              ? "bg-green-500/20 text-green-400" 
              : "bg-yellow-500/20 text-yellow-400"
          }`}>
            {current.type === "sale" ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <Package className="h-4 w-4" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white">
              {current.type === "sale" ? (
                <>
                  <span className="text-green-400 font-medium">Sold!</span>{" "}
                  <Link 
                    href={`/listing/${current.id.replace("sale-", "")}`}
                    className="hover:underline text-gray-200"
                  >
                    {current.title.length > 35 ? current.title.slice(0, 35) + "..." : current.title}
                  </Link>
                </>
              ) : (
                <>
                  <Link 
                    href={`/profile/${encodeURIComponent(current.sellerName)}`}
                    className="text-yellow-400 font-medium hover:underline"
                  >
                    {current.sellerName}
                  </Link>{" "}
                  listed{" "}
                  <Link 
                    href={`/listing/${current.id.replace("listing-", "")}`}
                    className="hover:underline text-gray-200"
                  >
                    {current.title.length > 30 ? current.title.slice(0, 30) + "..." : current.title}
                  </Link>
                </>
              )}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">{timeAgo(current.timestamp)}</p>
          </div>
        </div>

        {/* Activity dots indicator */}
        <div className="flex justify-center gap-1 pt-2">
          {activities.slice(0, 5).map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                i === currentIndex % 5 ? "bg-yellow-400" : "bg-gray-600"
              }`}
              aria-label={`View activity ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
