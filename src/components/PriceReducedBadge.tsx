"use client";

import { useEffect, useState } from "react";
import { TrendingDown } from "lucide-react";

interface PriceReducedBadgeProps {
  listingId: string;
}

interface PriceReduction {
  old_price_gbp: number;
  new_price_gbp: number;
  change_percentage: number;
  created_at: string;
}

export default function PriceReducedBadge({ listingId }: PriceReducedBadgeProps) {
  const [reduction, setReduction] = useState<PriceReduction | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPriceHistory();
  }, [listingId]);

  async function fetchPriceHistory() {
    try {
      const response = await fetch(`/api/price-history?listing_id=${listingId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.stats?.latest_reduction) {
          setReduction(data.stats.latest_reduction);
        }
      }
    } catch (error) {
      console.error("Failed to fetch price history:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading || !reduction) {
    return null;
  }

  const daysAgo = Math.floor(
    (new Date().getTime() - new Date(reduction.created_at).getTime()) / (1000 * 60 * 60 * 24)
  );

  // Only show badge if price was reduced within last 30 days
  if (daysAgo > 30) {
    return null;
  }

  const percentageText = Math.abs(reduction.change_percentage).toFixed(0);

  return (
    <div className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-red-500 to-red-600 px-3 py-1.5 text-sm font-bold text-white shadow-md animate-pulse">
      <TrendingDown className="h-4 w-4" />
      <span>Price Reduced {percentageText}%</span>
      {daysAgo < 7 && <span className="text-xs opacity-90">• {daysAgo}d ago</span>}
    </div>
  );
}
