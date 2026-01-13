"use client";

import { BusinessProfile } from "./BusinessStorefront";
import { Star, Clock, TrendingUp, MessageCircle } from "lucide-react";

type Props = {
  business: BusinessProfile;
  className?: string;
};

export default function BusinessStats({ business, className = "" }: Props) {
  const formatResponseTime = (minutes: number | null) => {
    if (!minutes) return "N/A";
    if (minutes < 60) return `${minutes} mins`;
    const hours = Math.floor(minutes / 60);
    return `${hours} hour${hours > 1 ? 's' : ''}`;
  };

  const stats = [
    {
      icon: Star,
      label: "Rating",
      value: business.avg_rating > 0 ? business.avg_rating.toFixed(1) : "New",
      subtitle: business.review_count > 0 ? `${business.review_count} reviews` : "No reviews yet",
    },
    {
      icon: Clock,
      label: "Response Time",
      value: formatResponseTime(business.avg_response_time_minutes),
      subtitle: business.response_rate ? `${business.response_rate}% response rate` : "New seller",
    },
    {
      icon: TrendingUp,
      label: "Total Sales",
      value: business.total_sales.toString(),
      subtitle: "Completed orders",
    },
    {
      icon: MessageCircle,
      label: "Member Since",
      value: new Date(business.member_since).getFullYear().toString(),
      subtitle: "Active seller",
    },
  ];

  return (
    <div className={`text-gray-900 bg-white ${className}`}>
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <div key={idx} className="rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm">
                <div className="flex items-center justify-center mb-2">
                  <Icon className="w-5 h-5" style={{ color: "var(--brand-primary)" }} />
                </div>
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="text-xs text-gray-600 mt-1">{stat.label}</div>
                <div className="text-xs text-gray-500 mt-0.5">{stat.subtitle}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
