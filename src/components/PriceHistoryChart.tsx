"use client";

import { useEffect, useState } from "react";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";

interface PriceHistoryChartProps {
  listingId: string;
}

interface PricePoint {
  id: string;
  old_price_gbp: number | null;
  new_price_gbp: number;
  change_percentage: number | null;
  created_at: string;
}

export default function PriceHistoryChart({ listingId }: PriceHistoryChartProps) {
  const [history, setHistory] = useState<PricePoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPriceHistory();
  }, [listingId]);

  async function fetchPriceHistory() {
    try {
      const response = await fetch(`/api/price-history?listing_id=${listingId}`);
      if (response.ok) {
        const data = await response.json();
        setHistory(data.history || []);
      }
    } catch (error) {
      console.error("Failed to fetch price history:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-yellow-500 border-t-transparent"></div>
      </div>
    );
  }

  // Only show if there are price changes
  const priceChanges = history.filter((h) => h.old_price_gbp !== null);
  if (priceChanges.length === 0) {
    return null;
  }

  const formatPrice = (price: number) => `£${price.toFixed(2)}`;
  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  const getChangeIcon = (percentage: number | null) => {
    if (!percentage) return <Minus className="h-4 w-4 text-gray-400" />;
    if (percentage < 0) return <TrendingDown className="h-4 w-4 text-red-500" />;
    if (percentage > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  const getChangeColor = (percentage: number | null) => {
    if (!percentage) return "text-gray-600";
    if (percentage < 0) return "text-red-600";
    if (percentage > 0) return "text-green-600";
    return "text-gray-600";
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <h3 className="mb-4 text-lg font-semibold text-gray-900">Price History</h3>

      <div className="space-y-3">
        {history.map((point, index) => (
          <div
            key={point.id}
            className="flex items-center justify-between border-b border-gray-100 pb-3 last:border-b-0 last:pb-0"
          >
            <div className="flex items-center gap-3">
              {getChangeIcon(point.change_percentage)}
              <div>
                <p className="font-medium text-gray-900">
                  {formatPrice(point.new_price_gbp)}
                </p>
                <p className="text-xs text-gray-500">{formatDate(point.created_at)}</p>
              </div>
            </div>

            <div className="text-right">
              {point.old_price_gbp && point.change_percentage !== null && (
                <>
                  <p className="text-sm text-gray-500 line-through">
                    {formatPrice(point.old_price_gbp)}
                  </p>
                  <p className={`text-sm font-medium ${getChangeColor(point.change_percentage)}`}>
                    {point.change_percentage > 0 ? "+" : ""}
                    {point.change_percentage.toFixed(1)}%
                  </p>
                </>
              )}
              {!point.old_price_gbp && (
                <p className="text-xs text-gray-500">Initial price</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      {priceChanges.length > 0 && (
        <div className="mt-4 rounded-lg bg-gray-50 p-3">
          <p className="text-xs text-gray-600">
            {priceChanges.length} price change{priceChanges.length !== 1 ? "s" : ""} •{" "}
            {priceChanges.filter((h) => (h.change_percentage || 0) < 0).length} reduction
            {priceChanges.filter((h) => (h.change_percentage || 0) < 0).length !== 1 ? "s" : ""}
          </p>
        </div>
      )}
    </div>
  );
}
