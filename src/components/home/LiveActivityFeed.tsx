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

type Props = {
  compact?: boolean;
};

function timeAgo(timestamp: string): string {
  const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
  
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
}

export default function LiveActivityFeed({ compact = false }: Props) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    async function fetchActivity() {
      try {
        const res = await fetch("/api/activity", { 
          next: { revalidate: 60 } // 1 minute
        });
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

  const minHeightClass = compact ? "lg:min-h-[180px]" : "lg:min-h-[var(--home-tiles-block-height)]";
  const paddingClass = compact ? "p-3" : "p-4";
  const cardPaddingClass = compact ? "p-2.5 sm:p-3" : "p-3 sm:p-4";
  const headerLabelClass = compact ? "text-[10px]" : "text-xs";
  const headerGapClass = compact ? "gap-1.5" : "gap-2";
  const headerMarginClass = compact ? "mb-1.5" : "mb-2";
  const imageMarginClass = compact ? "mb-1.5" : "mb-2";
  const desktopGapClass = compact ? "lg:gap-3" : "lg:gap-4";
  const desktopThumbClass = compact ? "w-24 h-24" : "w-28 h-28";
  const dotsMarginClass = compact ? "mt-2" : "mt-3";

  // Loading skeleton - matches category tile style
  if (loading) {
    return (
      <div className={`bg-white border border-gray-200 rounded-xl ${paddingClass} animate-pulse ${minHeightClass}`}>
        <div className={`flex items-center ${headerGapClass} mb-3`}>
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
      <div className={`bg-white border border-gray-200 rounded-xl ${paddingClass} ${minHeightClass}`}>
        <div className={`flex items-center ${headerGapClass} ${headerMarginClass}`}>
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className={`${headerLabelClass} font-medium text-gray-500`}>Live Activity</span>
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
      className={`block bg-white border border-gray-200 rounded-xl ${cardPaddingClass} hover:border-gray-300 hover:shadow-md transition-all ${minHeightClass}`}
    >
      {/* Mobile/Tablet: Vertical Layout */}
      <div className="lg:hidden">
        {/* Header */}
        <div className={`flex items-center justify-between ${headerMarginClass}`}>
          <div className={`flex items-center ${headerGapClass}`}>
            <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
            <span className={`${headerLabelClass} font-semibold text-gray-500 tracking-wide uppercase`}>Live activity</span>
          </div>
          <span className={`${headerLabelClass} text-gray-400`}>{timeAgo(current.timestamp)}</span>
        </div>

        <div className={`bg-gray-50 rounded-xl overflow-hidden ${imageMarginClass} aspect-[16/9] flex items-center justify-center`}>
          {current.image ? (
            <img
              src={current.image}
              alt={current.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-center px-4 text-gray-400 text-xs">
              Recent activity from {current.sellerName}
            </div>
          )}
        </div>

        {/* Activity message */}
        <p className="text-xs text-gray-800 leading-snug">
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
      </div>

      {/* Desktop: Horizontal Layout */}
      <div className={`hidden lg:flex lg:items-center ${desktopGapClass}`}>
        {/* Thumbnail */}
        <div className={`flex-shrink-0 ${desktopThumbClass} bg-gray-50 rounded-lg overflow-hidden`}>
          {current.image ? (
            <img
              src={current.image}
              alt={current.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
              No image
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className={`flex items-center ${headerGapClass} ${headerMarginClass}`}>
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className={`${headerLabelClass} font-semibold text-gray-500 tracking-wide uppercase`}>Live activity</span>
            <span className={`${headerLabelClass} text-gray-400 ml-auto`}>{timeAgo(current.timestamp)}</span>
          </div>
          
          <p className="text-sm text-gray-800 leading-relaxed line-clamp-2">
            {current.type === "sale" ? (
              <>
                <span className="text-green-600 font-medium">Sold: </span>
                {current.title}
              </>
            ) : (
              <>
                New <span className="font-medium">{current.title}</span> listed
              </>
            )}
          </p>
          
          <p className="text-xs text-gray-500 mt-1">
            by {current.sellerName}
          </p>
        </div>
      </div>

      {/* Dots indicator - only show if multiple activities */}
      {activities.length > 1 && (
        <div className={`flex justify-center gap-1.5 ${dotsMarginClass}`}>
          {activities.slice(0, Math.min(5, activities.length)).map((_, i) => (
            <span
              key={i}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                i === currentIndex % Math.min(5, activities.length) ? "bg-gray-500" : "bg-gray-200"
              }`}
            />
          ))}
        </div>
      )}
    </Link>
  );
}
