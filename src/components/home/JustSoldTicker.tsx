"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

type SoldItem = {
  id: string;
  title: string;
  timestamp: string;
};

type Props = {
  compact?: boolean;
};

export default function JustSoldTicker({ compact = false }: Props) {
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

  const containerClass = compact ? "py-1" : "py-2";
  const labelClass = compact
    ? "text-[10px] font-semibold text-green-700 uppercase tracking-wide whitespace-nowrap"
    : "text-xs font-semibold text-green-700 uppercase tracking-wide whitespace-nowrap";
  const iconClass = compact ? "h-3.5 w-3.5 text-green-600" : "h-4 w-4 text-green-600";
  const rowClass = compact ? "px-3 gap-1.5" : "px-4 gap-2";
  const itemClass = compact
    ? "inline-flex items-center gap-2 text-xs text-gray-700 hover:text-green-700 transition-colors"
    : "inline-flex items-center gap-2 text-sm text-gray-700 hover:text-green-700 transition-colors";
  const titleMax = compact ? 32 : 40;

  return (
    <div className={`bg-green-50 border-y border-green-100 ${containerClass} overflow-hidden`}>
      <div className="flex items-center">
        <div className={`flex-shrink-0 flex items-center border-r border-green-200 ${rowClass}`}>
          <CheckCircle2 className={iconClass} />
          <span className={labelClass}>Just Sold</span>
        </div>
        
        <div className="flex-1 overflow-hidden">
          <div className="animate-scroll-left flex items-center gap-8 whitespace-nowrap">
            {duplicatedSales.map((sale, index) => (
              <Link
                key={`${sale.id}-${index}`}
                href={`/listing/${sale.id}`}
                className={itemClass}
              >
                <span className="text-green-500">✓</span>
                <span className="font-medium">
                  {sale.title.length > titleMax ? sale.title.slice(0, titleMax) + "..." : sale.title}
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
