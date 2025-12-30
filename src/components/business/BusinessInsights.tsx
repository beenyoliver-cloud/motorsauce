"use client";

import { useMemo } from "react";
import { AlertTriangle, BarChart3, Clock3, Search, ShieldCheck, TrendingDown, Eye, UploadCloud } from "lucide-react";

type Listing = {
  id: string | number;
  title?: string;
  price?: number | string;
  created_at?: string | null;
  view_count?: number | null;
  oem?: string | null;
  images?: string[] | null;
};

function toNumber(value?: number | string | null) {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const n = Number(value.replace(/[^\d.]/g, ""));
    return Number.isFinite(n) ? n : NaN;
  }
  return NaN;
}

function median(nums: number[]) {
  if (!nums.length) return null;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export default function BusinessInsights({ listings }: { listings: Listing[] }) {
  const today = Date.now();

  const metrics = useMemo(() => {
    const prices = listings
      .map((l) => toNumber(l.price))
      .filter((n) => Number.isFinite(n) && n > 0) as number[];
    const avgPrice = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : null;
    const medPrice = median(prices);
    const stale = listings.filter((l) => {
      const age = l.created_at ? today - new Date(l.created_at).getTime() : 0;
      return age > 1000 * 60 * 60 * 24 * 45; // 45 days
    });
    const missingOem = listings.filter((l) => !l.oem);
    const lowPhotos = listings.filter((l) => !l.images || l.images.length < 3);
    const highViewsLowPrice = listings.filter((l) => {
      const views = typeof l.view_count === "number" ? l.view_count : 0;
      const price = toNumber(l.price);
      return views > 50 && price > 0 && price < (medPrice || price);
    });
    return {
      avgPrice,
      medPrice,
      staleCount: stale.length,
      missingOem: missingOem.length,
      lowPhotos: lowPhotos.length,
      highViewsLowPrice,
    };
  }, [listings, today]);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Business insights</p>
          <h3 className="text-lg font-semibold text-gray-900">Inventory & demand</h3>
        </div>
        <div className="text-xs text-gray-500">Owner-only</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
          <p className="text-xs font-semibold text-gray-600">Inventory health</p>
          <ul className="mt-2 space-y-1 text-sm text-gray-800">
            <li>Stale listings: <strong>{metrics.staleCount}</strong></li>
            <li>Missing OEM/VIN: <strong>{metrics.missingOem}</strong></li>
            <li>Under 3 photos: <strong>{metrics.lowPhotos}</strong></li>
          </ul>
        </div>
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
          <p className="text-xs font-semibold text-gray-600">Pricing signals</p>
          <ul className="mt-2 space-y-1 text-sm text-gray-800">
            <li>Avg price: <strong>{metrics.avgPrice ? `£${metrics.avgPrice.toFixed(2)}` : "—"}</strong></li>
            <li>Median price: <strong>{metrics.medPrice ? `£${metrics.medPrice.toFixed(2)}` : "—"}</strong></li>
            <li>High views & low price: <strong>{metrics.highViewsLowPrice.length}</strong></li>
          </ul>
        </div>
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
          <p className="text-xs font-semibold text-gray-600">Demand & watch</p>
          <ul className="mt-2 space-y-1 text-sm text-gray-800">
            <li>Views captured: <strong>{listings.reduce((sum, l) => sum + (l.view_count || 0), 0)}</strong></li>
            <li>Top search terms: <strong>Coming soon</strong></li>
            <li>Zero-result queries: <strong>Coming soon</strong></li>
          </ul>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50 p-3 flex gap-2 text-sm text-amber-900">
          <AlertTriangle className="h-5 w-5" />
          <div>
            <p className="font-semibold">Conversion blockers</p>
            <p>Review stale listings, add OEM codes, and upload 3+ photos to improve trust.</p>
          </div>
        </div>
        <div className="rounded-lg border border-dashed border-blue-200 bg-blue-50 p-3 flex gap-2 text-sm text-blue-900">
          <BarChart3 className="h-5 w-5" />
          <div>
            <p className="font-semibold">Promotion effectiveness</p>
            <p>Featured/spotlight impact reporting coming soon.</p>
          </div>
        </div>
        <div className="rounded-lg border border-dashed border-green-200 bg-green-50 p-3 flex gap-2 text-sm text-green-900">
          <ShieldCheck className="h-5 w-5" />
          <div>
            <p className="font-semibold">Compliance</p>
            <p>Keep VAT/returns docs updated in compliance settings.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-lg border border-gray-200 bg-white p-3 flex items-center justify-between">
          <div className="text-sm text-gray-800">
            Fulfilment SLAs (dispatch, cancellations, returns)
          </div>
          <Clock3 className="h-5 w-5 text-gray-500" />
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-3 flex items-center justify-between">
          <div className="text-sm text-gray-800">
            Support inbox & offers queue
          </div>
          <Search className="h-5 w-5 text-gray-500" />
        </div>
      </div>

      <div className="rounded-lg border border-dashed border-gray-300 bg-white p-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-800">
          <UploadCloud className="h-5 w-5 text-gray-600" />
          <span>Bulk edit prices/quantities and export analytics (coming soon).</span>
        </div>
        <TrendingDown className="h-5 w-5 text-gray-500" />
      </div>
    </div>
  );
}
