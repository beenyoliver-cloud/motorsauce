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
            <div className="w-16 h-16 shrink-0 ring-2 ring-gray-200 group-hover:ring-yellow-400 transition-all duration-300 rounded-full overflow-hidden">
              <div className="w-full h-full overflow-hidden rounded-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.avatar || "/images/seller1.jpg"} alt={s.seller_name} className="w-full h-full object-cover object-center" />
              </div>
            </div>
            <div className="mt-2 text-sm font-semibold text-gray-900 group-hover:text-yellow-600 line-clamp-1 transition-colors duration-300" title={s.seller_name}>{s.seller_name}</div>
            <div className="text-[11px] text-gray-600 flex items-center gap-2">
              <span className="flex items-center gap-0.5">
                <svg className="w-3 h-3 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                {typeof s.rating === 'number' ? s.rating.toFixed(1) : '5.0'}
              </span>
              {/* Trust badge if sold_count available */}
              <TrustBadge soldCount={s.sold_count} />
            </div>
          </Link>
        );
      })}
    </div>
  );
}
