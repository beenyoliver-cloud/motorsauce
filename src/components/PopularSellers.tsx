"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Seller = { seller_name: string; avatar?: string | null; clicks?: number; rating?: number; seller_id?: string };

export default function PopularSellers() {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetch("/api/popular-sellers")
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

  if (loading) return <div className="text-sm text-gray-500">Loading popular sellers…</div>;
  if (!sellers.length) return <div className="text-sm text-gray-500">No popular sellers yet.</div>;

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
            className="flex flex-col items-center text-center p-3 border rounded bg-white hover:shadow focus:outline-none focus:ring-2 focus:ring-yellow-400"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={s.avatar || "/images/seller1.jpg"} alt={s.seller_name} className="h-16 w-16 rounded-full object-cover" />
            <div className="mt-2 text-sm font-semibold text-gray-900 line-clamp-1" title={s.seller_name}>{s.seller_name}</div>
            <div className="text-[11px] text-gray-600 flex items-center gap-1">
              <span>⭐ {typeof s.rating === 'number' ? s.rating.toFixed(1) : '5.0'}</span>
              <span className="text-gray-400">• {(s.clicks || 0).toLocaleString()} clicks</span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
