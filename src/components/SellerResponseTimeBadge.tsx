"use client";

import { Clock, Zap, Timer, Snail } from "lucide-react";

interface SellerResponseTimeBadgeProps {
  avgResponseTimeMinutes: number | null;
  responseRate?: number | null;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
}

export default function SellerResponseTimeBadge({
  avgResponseTimeMinutes,
  responseRate,
  showLabel = true,
  size = "md",
}: SellerResponseTimeBadgeProps) {
  // No data yet
  if (avgResponseTimeMinutes === null || avgResponseTimeMinutes === undefined) {
    return null;
  }

  // Calculate display values
  let timeText = "";
  let speedLevel: "instant" | "fast" | "moderate" | "slow" = "moderate";
  let icon = Clock;
  let colorClasses = "";
  let bgClasses = "";

  if (avgResponseTimeMinutes < 15) {
    // Under 15 minutes - Instant
    timeText = "within a few minutes";
    speedLevel = "instant";
    icon = Zap;
    colorClasses = "text-green-700 border-green-300";
    bgClasses = "bg-green-50";
  } else if (avgResponseTimeMinutes < 60) {
    // Under 1 hour - Fast
    timeText = "within an hour";
    speedLevel = "fast";
    icon = Timer;
    colorClasses = "text-blue-700 border-blue-300";
    bgClasses = "bg-blue-50";
  } else if (avgResponseTimeMinutes < 240) {
    // Under 4 hours - Moderate
    const hours = Math.round(avgResponseTimeMinutes / 60);
    timeText = `within ${hours} hour${hours > 1 ? "s" : ""}`;
    speedLevel = "moderate";
    icon = Clock;
    colorClasses = "text-amber-700 border-amber-300";
    bgClasses = "bg-amber-50";
  } else if (avgResponseTimeMinutes < 1440) {
    // Under 24 hours - Moderate
    const hours = Math.round(avgResponseTimeMinutes / 60);
    timeText = `within ${hours} hours`;
    speedLevel = "moderate";
    icon = Clock;
    colorClasses = "text-amber-700 border-amber-300";
    bgClasses = "bg-amber-50";
  } else {
    // Over 24 hours - Slow
    const days = Math.round(avgResponseTimeMinutes / 1440);
    timeText = `within ${days} day${days > 1 ? "s" : ""}`;
    speedLevel = "slow";
    icon = Snail;
    colorClasses = "text-gray-600 border-gray-300";
    bgClasses = "bg-gray-50";
  }

  const Icon = icon;

  // Size variants
  const sizeClasses = {
    sm: "text-xs px-2 py-1 gap-1",
    md: "text-sm px-3 py-1.5 gap-1.5",
    lg: "text-base px-4 py-2 gap-2",
  };

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  // Response rate badge (optional)
  const showResponseRate = responseRate !== null && responseRate !== undefined && responseRate < 95;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div
        className={`inline-flex items-center border rounded-full font-medium ${colorClasses} ${bgClasses} ${sizeClasses[size]}`}
        title={`Average response time: ${Math.round(avgResponseTimeMinutes)} minutes`}
      >
        <Icon className={iconSizes[size]} />
        {showLabel && <span>Usually responds {timeText}</span>}
      </div>

      {showResponseRate && (
        <div
          className="inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-600 bg-gray-100 border border-gray-300 rounded-full"
          title={`Responds to ${responseRate?.toFixed(0)}% of inquiries`}
        >
          <span>{responseRate?.toFixed(0)}% response rate</span>
        </div>
      )}
    </div>
  );
}
