// src/components/category/CategoryStats.tsx
"use client";

import { useEffect, useState } from "react";
import { Package, Users, Star, TrendingUp, DollarSign } from "lucide-react";

type StatsData = {
  totalListings: number;
  listingsThisWeek: number;
  activeSellers: number;
  avgRating: number | null;
  priceRange: { min: number; max: number } | null;
  topMakes: string[];
};

type Props = {
  category: "oem" | "aftermarket" | "tools" | "OEM" | "Aftermarket" | "Tools";
  make?: string;
};

export default function CategoryStats({ category, make }: Props) {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const normalizedCategory = category.toLowerCase() as "oem" | "aftermarket" | "tools";

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setStats(null);

    const fetchStats = async () => {
      try {
        const params = new URLSearchParams({ category: normalizedCategory });
        if (make) params.set("make", make);
        
        const res = await fetch(`/api/categories/stats?${params.toString()}`);
        if (res.ok && !cancelled) {
          const data = await res.json();
          setStats(data);
        }
      } catch (err) {
        console.error("Failed to fetch category stats:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchStats();
    return () => {
      cancelled = true;
    };
  }, [normalizedCategory, make]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 bg-gray-100 rounded-xl" />
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const hasRating = typeof stats.avgRating === "number" && !Number.isNaN(stats.avgRating);

  const statItems = [
    {
      icon: Package,
      label: "Total listings",
      value: stats.totalListings.toLocaleString(),
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      icon: TrendingUp,
      label: "New this week",
      value: stats.listingsThisWeek.toLocaleString(),
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      icon: Users,
      label: "Active sellers",
      value: stats.activeSellers.toLocaleString(),
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      icon: hasRating ? Star : DollarSign,
      label: hasRating ? "Avg. rating" : "Price range",
      value: hasRating
        ? `${stats.avgRating?.toFixed(1)}★`
        : stats.priceRange
          ? `£${stats.priceRange.min}–£${stats.priceRange.max}`
          : "N/A",
      color: hasRating ? "text-yellow-600" : "text-emerald-600",
      bgColor: hasRating ? "bg-yellow-50" : "bg-emerald-50",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {statItems.map((item) => (
        <div
          key={item.label}
          className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
        >
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${item.bgColor}`}>
            <item.icon className={`h-5 w-5 ${item.color}`} />
          </div>
          <div>
            <div className="text-lg font-bold text-gray-900">{item.value}</div>
            <div className="text-xs text-gray-500">{item.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
