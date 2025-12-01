"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
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
            className="group flex flex-col items-center text-center p-3 border border-gray-200 rounded-xl bg-white hover:shadow-lg hover:border-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition-all duration-300 transform hover:-translate-y-1 hover:scale-105"
          >
            <div className="relative w-16 h-16 rounded-full overflow-hidden ring-2 ring-gray-200 group-hover:ring-yellow-400 transition-all duration-300 shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.avatar || "/images/seller1.jpg"} alt={s.seller_name} className="absolute inset-0 w-full h-full object-cover object-center" />
            </div>
            <div className="mt-2 text-sm font-semibold text-gray-900 group-hover:text-yellow-600 line-clamp-1 transition-colors duration-300" title={s.seller_name}>{s.seller_name}</div>
            <div className="text-[11px] text-gray-600 flex items-center gap-2">
              <span>⭐ {typeof s.rating === 'number' ? s.rating.toFixed(1) : '5.0'}</span>
              {/* Trust badge if sold_count available */}
              <TrustBadge soldCount={s.sold_count} />
            </div>
          </Link>
        );
      })}
    </div>
  );
}
