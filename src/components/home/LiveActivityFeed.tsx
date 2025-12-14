"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
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

  // Cycle through activities every 5 seconds
  useEffect(() => {
    if (activities.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activities.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [activities.length]);

  // Loading skeleton - matches category tile style
  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-4 animate-pulse">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 bg-gray-200 rounded-full" />
          <div className="w-12 h-3 bg-gray-200 rounded" />
        </div>
        <div className="h-10 bg-gray-100 rounded" />
      </div>
    );
  }
  
  // Empty state
  if (activities.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-xs font-medium text-gray-500">Live</span>
        </div>
        <p className="text-sm text-gray-400">
          No recent activity
        </p>
      </div>
    );
  }

  const current = activities[currentIndex];
  const listingId = current.id.replace("listing-", "").replace("sale-", "");

  return (
    <Link 
      href={`/listing/${listingId}`}
      className="block bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-300 hover:shadow-sm transition-all"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        <span className="text-xs font-medium text-gray-500">Live</span>
      </div>

      {/* Activity message */}
      <p className="text-sm text-gray-700 leading-snug">
        {current.type === "sale" ? (
          <>
            <span className="text-green-600 font-medium">Sold: </span>
            {current.title.length > 40 ? current.title.slice(0, 40) + "..." : current.title}
          </>
        ) : (
          <>
            New <span className="font-medium">{current.title.length > 35 ? current.title.slice(0, 35) + "..." : current.title}</span> listed
          </>
        )}
      </p>

      {/* Timestamp */}
      <p className="text-xs text-gray-400 mt-1">{timeAgo(current.timestamp)}</p>

      {/* Dots indicator - only show if multiple activities */}
      {activities.length > 1 && (
        <div className="flex justify-center gap-1 mt-3">
          {activities.slice(0, Math.min(5, activities.length)).map((_, i) => (
            <span
              key={i}
              className={`w-1 h-1 rounded-full transition-colors ${
                i === currentIndex % Math.min(5, activities.length) ? "bg-gray-400" : "bg-gray-200"
              }`}
            />
          ))}
        </div>
      )}
    </Link>
  );
}
