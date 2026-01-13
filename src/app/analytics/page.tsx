"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Package, Eye, ShoppingCart, TrendingUp, ArrowLeft, Loader2 } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase";
import BusinessInsights from "@/components/business/BusinessInsights";

interface Metrics {
  total_listings: number;
  active_listings: number;
  sold_listings: number;
  total_views: number;
  total_offers: number;
  accepted_offers: number;
  listings_today: number;
  offers_today: number;
  listings_week: number;
  offers_week: number;
  listings_month: number;
  offers_month: number;
  recent_listings: Array<{ id: string; title: string; created_at: string }>;
  top_listings: Array<{ id: string; title: string; view_count: number; price: string }>;
  all_listings: Array<{ id: string; title?: string; price?: number | string; created_at?: string; view_count?: number; oem?: string | null; images?: string[] | null }>;
}

export default function BusinessAnalytics() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState<string>("");

  useEffect(() => {
    checkBusinessAndFetchMetrics();
  }, []);

  async function checkBusinessAndFetchMetrics() {
    try {
      const supabase = supabaseBrowser();
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        router.push("/auth/login?next=/analytics");
        return;
      }

      // Check if user is business account
      const { data: profile } = await supabase
        .from("profiles")
        .select("account_type, name")
        .eq("id", user.id)
        .single();

      if (!profile || profile.account_type !== "business") {
        router.push("/");
        return;
      }

      setBusinessName(profile.name);

      // Fetch metrics
      const supabase2 = supabaseBrowser();
      const { data: { session } } = await supabase2.auth.getSession();
      if (!session) {
        throw new Error("No session");
      }

      const response = await fetch("/api/business-metrics", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to fetch metrics");
      }

      const data = await response.json();
      setMetrics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-yellow-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Link href="/" className="text-yellow-600 hover:text-yellow-700 font-medium">
            ← Back to home
          </Link>
        </div>
      </div>
    );
  }

  const conversionRate = metrics?.total_offers && metrics?.total_views
    ? ((metrics.total_offers / metrics.total_views) * 100).toFixed(1)
    : "0";

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/" className="text-gray-600 hover:text-gray-900">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
            <p className="text-gray-600 mt-1">{businessName} • Your business performance</p>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Active Listings"
            value={metrics?.active_listings || 0}
            subtitle={`${metrics?.total_listings || 0} total`}
            icon={<Package className="h-6 w-6" />}
            color="blue"
          />
          <StatCard
            title="Total Views"
            value={metrics?.total_views || 0}
            subtitle={`${metrics?.total_views ? Math.round((metrics.total_views / (metrics.total_listings || 1))) : 0} per listing avg`}
            icon={<Eye className="h-6 w-6" />}
            color="green"
          />
          <StatCard
            title="Offers Received"
            value={metrics?.total_offers || 0}
            subtitle={`${metrics?.accepted_offers || 0} accepted`}
            icon={<ShoppingCart className="h-6 w-6" />}
            color="yellow"
          />
          <StatCard
            title="Conversion Rate"
            value={`${conversionRate}%`}
            subtitle="Views to offers"
            icon={<TrendingUp className="h-6 w-6" />}
            color="purple"
          />
        </div>

        {/* Growth Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-600" />
              Listing Activity
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Today</span>
                <span className="font-semibold text-gray-900">{metrics?.listings_today || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">This Week</span>
                <span className="font-semibold text-gray-900">{metrics?.listings_week || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">This Month</span>
                <span className="font-semibold text-gray-900">{metrics?.listings_month || 0}</span>
              </div>
              <div className="pt-3 border-t border-gray-200 flex justify-between items-center">
                <span className="text-gray-600 font-medium">Sold</span>
                <span className="font-semibold text-gray-900">{metrics?.sold_listings || 0}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-green-600" />
              Offer Activity
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Today</span>
                <span className="font-semibold text-gray-900">{metrics?.offers_today || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">This Week</span>
                <span className="font-semibold text-gray-900">{metrics?.offers_week || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">This Month</span>
                <span className="font-semibold text-gray-900">{metrics?.offers_month || 0}</span>
              </div>
              <div className="pt-3 border-t border-gray-200 flex justify-between items-center">
                <span className="text-gray-600 font-medium">Acceptance Rate</span>
                <span className="font-semibold text-gray-900">
                  {metrics?.total_offers
                    ? ((metrics.accepted_offers / metrics.total_offers) * 100).toFixed(0)
                    : 0}
                  %
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Eye className="h-5 w-5 text-orange-600" />
              Engagement
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total Views</span>
                <span className="font-semibold text-gray-900">{metrics?.total_views || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total Offers</span>
                <span className="font-semibold text-gray-900">{metrics?.total_offers || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Accepted</span>
                <span className="font-semibold text-gray-900">{metrics?.accepted_offers || 0}</span>
              </div>
              <div className="pt-3 border-t border-gray-200 flex justify-between items-center">
                <span className="text-gray-600 font-medium">Conversion</span>
                <span className="font-semibold text-gray-900">{conversionRate}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Top Performing & Recent */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Listings</h3>
            {metrics?.top_listings && metrics.top_listings.length > 0 ? (
              <div className="space-y-3">
                {metrics.top_listings.map((listing) => (
                  <Link
                    key={listing.id}
                    href={`/listing/${listing.id}`}
                    className="flex items-start justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{listing.title}</p>
                      <p className="text-xs text-gray-600 mt-1">{listing.price}</p>
                    </div>
                    <div className="text-right ml-2">
                      <p className="text-sm font-semibold text-yellow-600">{listing.view_count}</p>
                      <p className="text-xs text-gray-600">views</p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-gray-600 text-sm">No listings yet</p>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Listings</h3>
            {metrics?.recent_listings && metrics.recent_listings.length > 0 ? (
              <div className="space-y-3">
                {metrics.recent_listings.map((listing) => (
                  <Link
                    key={listing.id}
                    href={`/listing/${listing.id}`}
                    className="flex items-start justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{listing.title}</p>
                      <p className="text-xs text-gray-600 mt-1">
                        {new Date(listing.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Link
                      href={`/listing/${listing.id}`}
                      className="text-sm font-medium text-yellow-600 hover:text-yellow-700 ml-2"
                    >
                      View →
                    </Link>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-gray-600 text-sm">No listings yet</p>
            )}
          </div>
        </div>

        {/* Business Insights */}
        {metrics?.all_listings && metrics.all_listings.length > 0 && (
          <div className="mb-8">
            <BusinessInsights listings={metrics.all_listings} variant="analytics" />
          </div>
        )}

        {/* Help */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-2">About Your Analytics</h3>
          <p className="text-sm text-blue-800 mb-4">
            This dashboard shows analytics for your business account only. Data includes views from your active listings,
            offers received, and conversion metrics. Use this information to optimize your catalogue and pricing.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="font-medium text-blue-900">Views</p>
              <p className="text-blue-800 text-xs">Total times your listings have been viewed</p>
            </div>
            <div>
              <p className="font-medium text-blue-900">Offers</p>
              <p className="text-blue-800 text-xs">Number of purchase offers received on your items</p>
            </div>
            <div>
              <p className="font-medium text-blue-900">Conversion</p>
              <p className="text-blue-800 text-xs">Percentage of views that result in offers</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
  color,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  color: "blue" | "green" | "yellow" | "purple";
}) {
  const colorClasses = {
    blue: "bg-blue-100 text-blue-600",
    green: "bg-green-100 text-green-600",
    yellow: "bg-yellow-100 text-yellow-600",
    purple: "bg-purple-100 text-purple-600",
  };
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>{icon}</div>
      </div>
      <h3 className="text-gray-600 text-sm font-medium">{title}</h3>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
    </div>
  );
}
