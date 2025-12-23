"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

type SoldItem = {
  id: string;
  title: string;
  timestamp: string;
};

export default function JustSoldTicker() {
  const [sales, setSales] = useState<SoldItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSales() {
      try {
        const res = await fetch("/api/activity", { 
          next: { revalidate: 60 } // 1 minute
        });
        if (res.ok) {
          const data = await res.json();
          // Filter only sales
          const salesOnly = data
            .filter((item: any) => item.type === "sale")
            .map((item: any) => ({
              id: item.id.replace("sale-", ""),
              title: item.title,
              timestamp: item.timestamp,
            }));
          setSales(salesOnly);
        }
      } catch {
        // Silently fail
      } finally {
        setLoading(false);
      }
    }

    fetchSales();
  }, []);

  // Don't show loading state or empty state - just hide if no data
  if (loading) return null;
  if (sales.length === 0) return null;

  // Create duplicated array for infinite scroll effect
  const duplicatedSales = [...sales, ...sales, ...sales];

  return (
    <div className="bg-green-50 border-y border-green-100 py-2 overflow-hidden">
      <div className="flex items-center">
        <div className="flex-shrink-0 px-4 flex items-center gap-2 border-r border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <span className="text-xs font-semibold text-green-700 uppercase tracking-wide whitespace-nowrap">
            Just Sold
          </span>
        </div>
        
        <div className="flex-1 overflow-hidden">
          <div className="animate-scroll-left flex items-center gap-8 whitespace-nowrap">
            {duplicatedSales.map((sale, index) => (
              <Link
                key={`${sale.id}-${index}`}
                href={`/listing/${sale.id}`}
                className="inline-flex items-center gap-2 text-sm text-gray-700 hover:text-green-700 transition-colors"
              >
                <span className="text-green-500">✓</span>
                <span className="font-medium">
                  {sale.title.length > 40 ? sale.title.slice(0, 40) + "..." : sale.title}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes scroll-left {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-33.333%);
          }
        }
        .animate-scroll-left {
          animation: scroll-left 30s linear infinite;
        }
        .animate-scroll-left:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}
