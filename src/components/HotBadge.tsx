"use client";

import { Flame } from "lucide-react";

interface HotBadgeProps {
  viewCount?: number;
  threshold?: number; // Number of views to be considered "hot"
  className?: string;
}

/**
 * Shows a flame badge for "hot" items with high views
 * Pass viewCount from the listing data
 */
export default function HotBadge({ 
  viewCount = 0, 
  threshold = 10, 
  className = "" 
}: HotBadgeProps) {
  // Only show if views exceed threshold
  if (viewCount < threshold) return null;

  return (
    <div 
      className={`inline-flex items-center gap-1 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-sm ${className}`}
      title={`${viewCount} views`}
    >
      <Flame className="h-3 w-3" />
      <span>HOT</span>
    </div>
  );
}

/**
 * Smaller version for listing cards
 */
export function HotBadgeSmall({ 
  viewCount = 0, 
  threshold = 10 
}: HotBadgeProps) {
  if (viewCount < threshold) return null;

  return (
    <div 
      className="absolute top-2 left-2 z-10 flex items-center gap-0.5 bg-gradient-to-r from-orange-500 to-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-lg"
      title={`${viewCount} views`}
    >
      <Flame className="h-2.5 w-2.5" />
      <span>HOT</span>
    </div>
  );
}
