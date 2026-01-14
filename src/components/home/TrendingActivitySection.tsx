import Link from "next/link";
import JustSoldTicker from "@/components/home/JustSoldTicker";
import LiveActivityFeed from "@/components/home/LiveActivityFeed";

type ActivityItem = {
  id: string;
  type: "listing" | "sale";
  title: string;
  sellerName: string;
  sellerId: string;
  timestamp: string;
  image?: string;
};

const MIN_ACTIVITY_ITEMS = 5;
const FALLBACK_SITE_URL = "http://localhost:3000";

function activityApiUrl(path: string) {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : FALLBACK_SITE_URL);
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

async function getActivity(): Promise<ActivityItem[]> {
  try {
    const res = await fetch(activityApiUrl("/api/activity"), {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? (data as ActivityItem[]) : [];
  } catch {
    return [];
  }
}

export default async function TrendingActivitySection() {
  const activities = await getActivity();
  if (activities.length < MIN_ACTIVITY_ITEMS) return null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between border-b border-gray-100 px-3 sm:px-5 py-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-600 uppercase tracking-[0.2em]">
          <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          Trending right now
        </div>
        <Link href="/search" className="text-xs font-semibold text-gray-600 hover:text-gray-900">
          View all -&gt;
        </Link>
      </div>
      <div className="p-3 sm:p-5 space-y-2 sm:space-y-3">
        <JustSoldTicker />
        <LiveActivityFeed />
      </div>
    </div>
  );
}
