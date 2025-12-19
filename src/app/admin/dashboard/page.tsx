"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Package, Users, DollarSign, Shield, AlertTriangle, TrendingUp, Ban, AlertCircle, ShieldCheck } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase";

interface Metrics {
  totalListings: number;
  activeListings: number;
  totalUsers: number;
  totalRevenue: number;
  pendingReports: number;
  bannedUsers: number;
  suspendedUsers: number;
  listingsToday: number;
  listingsThisWeek: number;
  listingsThisMonth: number;
  usersToday: number;
  usersThisWeek: number;
  usersThisMonth: number;
  topSellers: Array<{ id: string; username: string; listing_count: number; total_sales: number }>;
  recentActivity: Array<{ id: string; type: string; description: string; created_at: string }>;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkAdminAndFetchMetrics();
  }, []);

  async function checkAdminAndFetchMetrics() {
    try {
      const supabase = supabaseBrowser();
      const [{ data: { user } }, { data: { session } }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.auth.getSession(),
      ]);

      if (!user || !session?.access_token) {
        router.push("/auth/login?next=/admin/dashboard");
        return;
      }

      const token = session.access_token;

      const adminRes = await fetch("/api/is-admin", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!adminRes.ok) {
        const body = await adminRes.text();
        throw new Error(body || "Failed to verify admin access");
      }

      const { isAdmin } = await adminRes.json();
      if (!isAdmin) {
        router.push("/");
        return;
      }

      const response = await fetch("/api/admin-metrics", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to fetch metrics");
      }
      const data = await response.json();
      
      // Map snake_case API response to camelCase for the interface
      setMetrics({
        totalListings: data.total_listings || 0,
        activeListings: data.active_listings || 0,
        totalUsers: data.total_users || 0,
        totalRevenue: data.total_sales || 0, // We use total_sales as revenue proxy
        pendingReports: data.pending_reports || 0,
        bannedUsers: data.banned_users || 0,
        suspendedUsers: data.suspended_users || 0,
        listingsToday: data.listings_today || 0,
        listingsThisWeek: data.listings_week || 0,
        listingsThisMonth: data.listings_month || 0,
        usersToday: data.users_today || 0,
        usersThisWeek: data.users_week || 0,
        usersThisMonth: data.users_month || 0,
        topSellers: data.top_sellers || [],
        recentActivity: data.recent_listings?.map((l: any) => ({
          id: l.id,
          type: 'listing',
          description: l.title,
          created_at: l.created_at
        })) || [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (<div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>);
  }

  if (error) {
    return (<div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="text-red-600">{error}</div></div>);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600 mt-1">Overview of your marketplace</p>
          </div>
          <Link href="/" className="text-blue-600 hover:text-blue-800">← Back to Site</Link>
        </div>

        {metrics?.pendingReports && metrics.pendingReports > 0 && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <span className="text-yellow-800">You have <strong>{metrics.pendingReports}</strong> pending user reports to review.</span>
            <Link href="/admin/reports" className="ml-auto text-yellow-700 hover:text-yellow-900 font-medium">View Reports →</Link>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard title="Total Listings" value={metrics?.totalListings || 0} subtitle={`${metrics?.activeListings || 0} active`} icon={<Package className="h-6 w-6" />} color="blue" />
          <StatCard title="Total Users" value={metrics?.totalUsers || 0} subtitle={`${metrics?.usersThisMonth || 0} this month`} icon={<Users className="h-6 w-6" />} color="green" />
          <StatCard title="Revenue" value={`£${(metrics?.totalRevenue || 0).toLocaleString()}`} subtitle="All time" icon={<DollarSign className="h-6 w-6" />} color="purple" />
          <StatCard title="Moderation" value={metrics?.bannedUsers || 0} subtitle={`${metrics?.suspendedUsers || 0} suspended`} icon={<Shield className="h-6 w-6" />} color="red" label="banned" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2"><TrendingUp className="h-5 w-5 text-blue-600" />Listings Growth</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center"><span className="text-gray-600">Today</span><span className="font-semibold text-gray-900">{metrics?.listingsToday || 0}</span></div>
              <div className="flex justify-between items-center"><span className="text-gray-600">This Week</span><span className="font-semibold text-gray-900">{metrics?.listingsThisWeek || 0}</span></div>
              <div className="flex justify-between items-center"><span className="text-gray-600">This Month</span><span className="font-semibold text-gray-900">{metrics?.listingsThisMonth || 0}</span></div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2"><Users className="h-5 w-5 text-green-600" />User Growth</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center"><span className="text-gray-600">Today</span><span className="font-semibold text-gray-900">{metrics?.usersToday || 0}</span></div>
              <div className="flex justify-between items-center"><span className="text-gray-600">This Week</span><span className="font-semibold text-gray-900">{metrics?.usersThisWeek || 0}</span></div>
              <div className="flex justify-between items-center"><span className="text-gray-600">This Month</span><span className="font-semibold text-gray-900">{metrics?.usersThisMonth || 0}</span></div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2"><AlertCircle className="h-5 w-5 text-orange-600" />Moderation Status</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center"><span className="text-gray-600">Pending Reports</span><span className="font-semibold text-orange-600">{metrics?.pendingReports || 0}</span></div>
              <div className="flex justify-between items-center"><span className="text-gray-600">Banned Users</span><span className="font-semibold text-red-600">{metrics?.bannedUsers || 0}</span></div>
              <div className="flex justify-between items-center"><span className="text-gray-600">Suspended Users</span><span className="font-semibold text-yellow-600">{metrics?.suspendedUsers || 0}</span></div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/admin/listings" className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-lg"><Package className="h-6 w-6 text-blue-600" /></div>
            <div><h3 className="font-semibold text-gray-900">Manage Listings</h3><p className="text-sm text-gray-600">View and moderate listings</p></div>
          </Link>
          <Link href="/admin/users" className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-lg"><Users className="h-6 w-6 text-green-600" /></div>
            <div><h3 className="font-semibold text-gray-900">Manage Users</h3><p className="text-sm text-gray-600">View and moderate users</p></div>
          </Link>
          <Link href="/admin/reports" className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow flex items-center gap-4">
            <div className="p-3 bg-orange-100 rounded-lg"><AlertTriangle className="h-6 w-6 text-orange-600" /></div>
            <div><h3 className="font-semibold text-gray-900">User Reports</h3><p className="text-sm text-gray-600">Review reported content</p></div>
          </Link>
          <Link href="/admin/moderation" className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow flex items-center gap-4">
            <div className="p-3 bg-red-100 rounded-lg"><Ban className="h-6 w-6 text-red-600" /></div>
            <div><h3 className="font-semibold text-gray-900">Moderation Log</h3><p className="text-sm text-gray-600">View moderation history</p></div>
          </Link>
          <Link href="/admin/verification" className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow flex items-center gap-4">
            <div className="p-3 bg-emerald-100 rounded-lg"><ShieldCheck className="h-6 w-6 text-emerald-600" /></div>
            <div><h3 className="font-semibold text-gray-900">Verify Sellers</h3><p className="text-sm text-gray-600">Review compliance documents</p></div>
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, subtitle, icon, color, label }: { title: string; value: string | number; subtitle: string; icon: React.ReactNode; color: "blue" | "green" | "purple" | "red"; label?: string }) {
  const colorClasses = { blue: "bg-blue-100 text-blue-600", green: "bg-green-100 text-green-600", purple: "bg-purple-100 text-purple-600", red: "bg-red-100 text-red-600" };
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4"><div className={`p-3 rounded-lg ${colorClasses[color]}`}>{icon}</div></div>
      <h3 className="text-gray-600 text-sm font-medium">{title}</h3>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}{label && <span className="text-sm font-normal text-gray-500 ml-1">{label}</span>}</p>
      <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
    </div>
  );
}
