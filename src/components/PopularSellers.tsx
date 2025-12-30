"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Star, Package } from "lucide-react";

import TrustBadge from "./TrustBadge";

type Seller = { seller_name: string; avatar?: string | null; clicks?: number; rating?: number; seller_id?: string; sold_count?: number };

export default function PopularSellers() {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch popular sellers
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetch("/api/popular-sellers-weekly")
      .then((r) => r.json())
      .then((data) => {
        if (!mounted) return;
        setSellers(Array.isArray(data) ? data : []);
      })
      .catch(() => setSellers([]))
      .finally(() => setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);
  
  // If no popular sellers, fetch top 5 sellers as fallback
  useEffect(() => {
    if (!loading && sellers.length === 0) {
      fetch("/api/search/sellers")
        .then((r) => r.json())
        .then((data) => {
          if (data.sellers && Array.isArray(data.sellers)) {
            // Convert to PopularSellers format and take top 5
            const topSellers = data.sellers.slice(0, 5).map((s: any) => ({
              seller_name: s.name,
              avatar: s.avatar,
              clicks: 0,
              rating: s.rating || 5,
              seller_id: s.id,
              sold_count: undefined,
            }));
            setSellers(topSellers);
          }
        })
        .catch(() => {});
    }
  }, [loading, sellers.length]);

  if (loading) return <div className="text-sm text-gray-500">Loading popular sellers…</div>;
  if (!sellers.length) return <div className="text-sm text-gray-500">No sellers yet.</div>;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {sellers.map((s) => {
        const href = s.seller_id ? `/profile/id/${encodeURIComponent(s.seller_id)}` : `/profile/${encodeURIComponent(s.seller_name)}`;
        return (
          <Link
            key={s.seller_name}
            href={href}
            onClick={() => {
              // optimistic clicks increment
              setSellers((prev) => prev.map((x) => x.seller_name === s.seller_name ? { ...x, clicks: (x.clicks || 0) + 1 } : x));
              try {
                const payload = JSON.stringify({ name: s.seller_name, avatar: s.avatar });
                if (navigator.sendBeacon) {
                  navigator.sendBeacon('/api/track-seller', new Blob([payload], { type: 'application/json' }));
                } else {
                  fetch('/api/track-seller', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload, keepalive: true }).catch(() => {});
                }
              } catch {}
            }}
            className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-4 hover:shadow-xl hover:border-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition-all duration-300"
          >
            {/* Background gradient on hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-50/0 to-yellow-100/0 group-hover:from-yellow-50/50 group-hover:to-yellow-100/30 transition-all duration-300" />
            
            <div className="relative flex items-center gap-4">
              {/* Avatar */}
              <div className="relative">
                <div className="w-16 h-16 shrink-0 ring-2 ring-gray-200 group-hover:ring-yellow-400 transition-all duration-300 rounded-full overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.avatar || "/images/seller1.jpg"} alt={s.seller_name} className="w-full h-full object-cover object-center" />
                </div>
                {/* Trust badge overlay */}
                {s.sold_count && s.sold_count > 0 && (
                  <div className="absolute -bottom-1 -right-1 bg-green-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center border-2 border-white">
                    ✓
                  </div>
                )}
              </div>
              
              {/* Seller info */}
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-gray-900 group-hover:text-yellow-600 truncate transition-colors duration-300" title={s.seller_name}>
                  {s.seller_name}
                </h3>
                
                {/* Rating */}
                <div className="flex items-center gap-1 mt-1">
                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  <span className="text-sm font-semibold text-gray-700">
                    {typeof s.rating === 'number' ? s.rating.toFixed(1) : '5.0'}
                  </span>
                  <span className="text-xs text-gray-500 ml-1">rating</span>
                </div>
                
                {/* Sold count or trust badge */}
                <div className="flex items-center gap-2 mt-1">
                  {s.sold_count && s.sold_count > 0 ? (
                    <div className="flex items-center gap-1 text-xs text-gray-600">
                      <Package className="w-3 h-3" />
                      <span className="font-medium">{s.sold_count}</span>
                      <span>sold</span>
                    </div>
                  ) : (
                    <TrustBadge soldCount={s.sold_count} />
                  )}
                </div>
              </div>
              
              {/* Arrow indicator */}
              <div className="text-gray-400 group-hover:text-yellow-600 transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
