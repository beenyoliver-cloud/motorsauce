"use client";"use client";

import { useEffect, useState } from "react";import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";import { useRouter } from "next/navigation";

import Link from "next/link";import { Package, Users, DollarSign, BarChart3, Shield } from "lucide-react";

import { import { supabaseBrowser } from "@/lib/supabase";

  Package, Users, DollarSign, BarChart3, Shield, TrendingUp, import { AdminNav, AdminBreadcrumb } from "@/components/AdminNav";

  AlertTriangle, Clock, UserCheck, FileText, Ban, Eye,

  ArrowUpRightexport default function AdminDashboard() {

} from "lucide-react";  const [metrics, setMetrics] = useState<{

import { supabaseBrowser } from "@/lib/supabase";    total_listings: number;

import { AdminNav, AdminBreadcrumb } from "@/components/AdminNav";    total_users: number;

    total_sales: number;

interface Metrics {  } | null>(null);

  total_listings: number;  const [loading, setLoading] = useState(true);

  total_users: number;  const [isAdmin, setIsAdmin] = useState(false);

  total_sales: number;  const [error, setError] = useState<string | null>(null);

  active_listings: number;  const router = useRouter();

  draft_listings: number;  const supabase = supabaseBrowser();

  sold_listings: number;

  users_today: number;  useEffect(() => {

  listings_today: number;    const checkAdminAndFetchMetrics = async () => {

  users_week: number;      setLoading(true);

  listings_week: number;      setError(null);

  users_month: number;      try {

  listings_month: number;        console.log('[AdminDashboard] Starting admin check...');

  pending_reports: number;        

  banned_users: number;        // Check if user is logged in

  suspended_users: number;        const { data: { user }, error: userError } = await supabase.auth.getUser();

  top_sellers: Array<{ id: string; name: string; avatar: string; count: number }>;        console.log('[AdminDashboard] User check result:', { user: user?.email, error: userError?.message });

  recent_users: Array<{ id: string; name: string; email: string; created_at: string }>;        

  recent_listings: Array<{ id: string; title: string; status: string; created_at: string }>;        if (userError || !user) {

  recent_reports: Array<{ id: string; reason: string; status: string; created_at: string }>;          console.log('[AdminDashboard] No user found, redirecting to login');

}          router.push("/auth/login?next=/admin/dashboard");

          return;

export default function AdminDashboard() {        }

  const [metrics, setMetrics] = useState<Metrics | null>(null);

  const [loading, setLoading] = useState(true);        // Check if user is admin using API endpoint (bypasses RLS)

  const [isAdmin, setIsAdmin] = useState(false);        const { data: { session } } = await supabase.auth.getSession();

  const [error, setError] = useState<string | null>(null);        console.log('[AdminDashboard] Session check:', { hasSession: !!session, hasToken: !!session?.access_token });

  const router = useRouter();        

  const supabase = supabaseBrowser();        if (!session?.access_token) {

          console.log('[AdminDashboard] No access token');

  useEffect(() => {          setError("No access token. Please log in again.");

    const checkAdminAndFetchMetrics = async () => {          setTimeout(() => router.push("/auth/login"), 2000);

      setLoading(true);          return;

      setError(null);        }

      try {

        const { data: { user }, error: userError } = await supabase.auth.getUser();        console.log('[AdminDashboard] Calling /api/is-admin...');

                const adminRes = await fetch("/api/is-admin", {

        if (userError || !user) {          headers: {

          router.push("/auth/login?next=/admin/dashboard");            Authorization: `Bearer ${session.access_token}`,

          return;          },

        }        });



        const { data: { session } } = await supabase.auth.getSession();        console.log('[AdminDashboard] API response status:', adminRes.status);

        

        if (!session?.access_token) {        if (!adminRes.ok) {

          setError("No access token. Please log in again.");          const errorText = await adminRes.text();

          setTimeout(() => router.push("/auth/login"), 2000);          console.error('[AdminDashboard] API error:', errorText);

          return;          setError("Failed to verify admin status.");

        }          setTimeout(() => router.push("/"), 2000);

          return;

        const adminRes = await fetch("/api/is-admin", {        }

          headers: { Authorization: `Bearer ${session.access_token}` },

        });        const adminData = await adminRes.json();

        console.log('[AdminDashboard] API response data:', adminData);

        if (!adminRes.ok) {        

          setError("Failed to verify admin status.");        if (!adminData.isAdmin) {

          setTimeout(() => router.push("/"), 2000);          console.log('[AdminDashboard] User is not admin, redirecting home');

          return;          setError("Access denied. Admin privileges required.");

        }          setTimeout(() => router.push("/"), 2000);

          return;

        const adminData = await adminRes.json();        }

        

        if (!adminData.isAdmin) {        console.log('[AdminDashboard] Admin check passed! Loading dashboard...');

          setError("Access denied. Admin privileges required.");        setIsAdmin(true);

          setTimeout(() => router.push("/"), 2000);

          return;        // Fetch metrics with auth header

        }        console.log('[AdminDashboard] Fetching metrics...');

        const metricsRes = await fetch("/api/admin-metrics", {

        setIsAdmin(true);          headers: {

            Authorization: `Bearer ${session.access_token}`,

        const metricsRes = await fetch("/api/admin-metrics", {          },

          headers: { Authorization: `Bearer ${session.access_token}` },        });

        });        

                console.log('[AdminDashboard] Metrics response status:', metricsRes.status);

        if (metricsRes.ok) {        

          const data = await metricsRes.json();        if (metricsRes.ok) {

          setMetrics(data);          const data = await metricsRes.json();

        } else {          console.log('[AdminDashboard] Metrics loaded:', data);

          setError("Failed to load metrics");          setMetrics(data);

        }        } else {

      } catch (err) {          const errorText = await metricsRes.text();

        setError(err instanceof Error ? err.message : "An error occurred");          console.error('[AdminDashboard] Metrics error:', errorText);

        setTimeout(() => router.push("/"), 2000);          setError("Failed to load metrics");

      } finally {        }

        setLoading(false);      } catch (err) {

      }        setError(err instanceof Error ? err.message : "An error occurred");

    };        setTimeout(() => router.push("/"), 2000);

    checkAdminAndFetchMetrics();      } finally {

  }, []);        setLoading(false);

      }

  if (loading) {    };

    return (    checkAdminAndFetchMetrics();

      <div className="max-w-7xl mx-auto mt-8 px-4">    // eslint-disable-next-line react-hooks/exhaustive-deps

        <div className="bg-white rounded-xl border border-gray-200 p-8">  }, []); // Only run once on mount

          <div className="flex items-center gap-3 mb-6">

            <Shield className="text-yellow-600" size={32} />  if (loading) {

            <h1 className="text-3xl font-bold text-black">Admin Dashboard</h1>    return (

          </div>      <div className="max-w-5xl mx-auto mt-12 px-4">

          <div className="animate-pulse grid grid-cols-1 md:grid-cols-4 gap-4">        <div className="bg-white rounded-xl border border-gray-200 p-8">

            {[...Array(8)].map((_, i) => (          <div className="flex items-center gap-3 mb-6">

              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>            <Shield className="text-yellow-600" size={32} />

            ))}            <h1 className="text-3xl font-bold text-black">Admin Dashboard</h1>

          </div>          </div>

        </div>          <div className="animate-pulse space-y-4">

      </div>            <div className="h-32 bg-gray-200 rounded-lg"></div>

    );            <div className="h-32 bg-gray-200 rounded-lg"></div>

  }            <div className="h-32 bg-gray-200 rounded-lg"></div>

          </div>

  if (error) {        </div>

    return (      </div>

      <div className="max-w-7xl mx-auto mt-8 px-4">    );

        <div className="bg-red-50 border border-red-200 rounded-xl p-8">  }

          <h1 className="text-2xl font-bold text-red-800 mb-2">Access Denied</h1>

          <p className="text-red-600">{error}</p>  if (error) {

        </div>    return (

      </div>      <div className="max-w-5xl mx-auto mt-12 px-4">

    );        <div className="bg-red-50 border border-red-200 rounded-xl p-8">

  }          <h1 className="text-2xl font-bold text-red-800 mb-2">Access Denied</h1>

          <p className="text-red-600">{error}</p>

  if (!isAdmin || !metrics) return null;        </div>

      </div>

  const formatTime = (dateStr: string) => {    );

    const date = new Date(dateStr);  }

    const now = new Date();

    const diff = now.getTime() - date.getTime();  if (!isAdmin) {

    const mins = Math.floor(diff / 60000);    return null;

    const hours = Math.floor(diff / 3600000);  }

    const days = Math.floor(diff / 86400000);

      return (

    if (mins < 60) return `${mins}m ago`;    <div className="max-w-5xl mx-auto mt-12 px-4 pb-12">

    if (hours < 24) return `${hours}h ago`;      <AdminBreadcrumb current="Dashboard" />

    return `${days}d ago`;      <AdminNav />

  };      

      <div className="bg-white rounded-xl border border-gray-200 p-8 mb-6">

  return (        <div className="flex items-center gap-3 mb-2">

    <div className="max-w-7xl mx-auto mt-8 px-4 pb-12">          <Shield className="text-yellow-600" size={32} />

      <AdminBreadcrumb current="Dashboard" />          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>

      <AdminNav />        </div>

              <p className="text-gray-600">Monitor platform metrics and activity</p>

      {/* Header */}      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">

        <div className="flex items-center justify-between">      {/* Metrics Cards */}

          <div className="flex items-center gap-3">      {metrics ? (

            <Shield className="text-yellow-600" size={32} />        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            <div>          {/* Total Parts Listed */}

              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>          <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition">

              <p className="text-gray-600">Platform overview and quick actions</p>            <div className="flex items-center justify-between mb-4">

            </div>              <div className="p-3 bg-yellow-100 rounded-lg">

          </div>                <Package className="text-yellow-600" size={24} />

          <div className="text-right text-sm text-gray-500">              </div>

            Last updated: {new Date().toLocaleTimeString()}              <BarChart3 className="text-gray-400" size={20} />

          </div>            </div>

        </div>            <h3 className="text-gray-600 text-sm font-medium mb-1">Total Parts Listed</h3>

      </div>            <p className="text-3xl font-bold text-gray-900">{metrics.total_listings.toLocaleString()}</p>

          </div>

      {/* Alert Banner for Pending Reports */}

      {metrics.pending_reports > 0 && (          {/* Total Users */}

        <Link href="/admin/reports?status=pending" className="block mb-6">          <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition">

          <div className="bg-orange-50 border-2 border-orange-300 rounded-xl p-4 flex items-center justify-between hover:bg-orange-100 transition-colors">            <div className="flex items-center justify-between mb-4">

            <div className="flex items-center gap-3">              <div className="p-3 bg-blue-100 rounded-lg">

              <AlertTriangle className="text-orange-600" size={24} />                <Users className="text-blue-600" size={24} />

              <div>              </div>

                <span className="font-bold text-orange-800">{metrics.pending_reports} pending reports</span>              <BarChart3 className="text-gray-400" size={20} />

                <span className="text-orange-600 ml-2">require review</span>            </div>

              </div>            <h3 className="text-gray-600 text-sm font-medium mb-1">Total Users</h3>

            </div>            <p className="text-3xl font-bold text-gray-900">{metrics.total_users.toLocaleString()}</p>

            <ArrowUpRight className="text-orange-600" size={20} />          </div>

          </div>

        </Link>          {/* Total Sales */}

      )}          <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition">

            <div className="flex items-center justify-between mb-4">

      {/* Main Stats Grid */}              <div className="p-3 bg-green-100 rounded-lg">

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">                <DollarSign className="text-green-600" size={24} />

        {/* Total Users */}              </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg transition">              <BarChart3 className="text-gray-400" size={20} />

          <div className="flex items-center justify-between mb-3">            </div>

            <div className="p-2 bg-blue-100 rounded-lg">            <h3 className="text-gray-600 text-sm font-medium mb-1">Total Sales</h3>

              <Users className="text-blue-600" size={20} />            <p className="text-3xl font-bold text-gray-900">{metrics.total_sales.toLocaleString()}</p>

            </div>          </div>

            {metrics.users_today > 0 && (        </div>

              <span className="flex items-center text-green-600 text-sm font-medium">      ) : (

                <ArrowUpRight size={14} /> +{metrics.users_today}        <div className="bg-white rounded-xl border border-gray-200 p-8">

              </span>          <p className="text-gray-600">Loading metrics...</p>

            )}        </div>

          </div>      )}

          <h3 className="text-gray-600 text-xs font-medium mb-1">Total Users</h3>    </div>

          <p className="text-2xl font-bold text-gray-900">{metrics.total_users.toLocaleString()}</p>  );

        </div>}


        {/* Active Listings */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg transition">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Package className="text-yellow-600" size={20} />
            </div>
            {metrics.listings_today > 0 && (
              <span className="flex items-center text-green-600 text-sm font-medium">
                <ArrowUpRight size={14} /> +{metrics.listings_today}
              </span>
            )}
          </div>
          <h3 className="text-gray-600 text-xs font-medium mb-1">Active Listings</h3>
          <p className="text-2xl font-bold text-gray-900">{metrics.active_listings.toLocaleString()}</p>
        </div>

        {/* Total Sales */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg transition">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="text-green-600" size={20} />
            </div>
          </div>
          <h3 className="text-gray-600 text-xs font-medium mb-1">Total Sales</h3>
          <p className="text-2xl font-bold text-gray-900">{metrics.total_sales.toLocaleString()}</p>
        </div>

        {/* Sold Items */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg transition">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <TrendingUp className="text-purple-600" size={20} />
            </div>
          </div>
          <h3 className="text-gray-600 text-xs font-medium mb-1">Items Sold</h3>
          <p className="text-2xl font-bold text-gray-900">{metrics.sold_listings.toLocaleString()}</p>
        </div>
      </div>

      {/* Time Period Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Today */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="text-blue-600" size={18} />
            <h3 className="font-semibold text-blue-900">Today</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-blue-600">New Users</p>
              <p className="text-xl font-bold text-blue-900">{metrics.users_today}</p>
            </div>
            <div>
              <p className="text-xs text-blue-600">New Listings</p>
              <p className="text-xl font-bold text-blue-900">{metrics.listings_today}</p>
            </div>
          </div>
        </div>

        {/* This Week */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="text-green-600" size={18} />
            <h3 className="font-semibold text-green-900">This Week</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-green-600">New Users</p>
              <p className="text-xl font-bold text-green-900">{metrics.users_week}</p>
            </div>
            <div>
              <p className="text-xs text-green-600">New Listings</p>
              <p className="text-xl font-bold text-green-900">{metrics.listings_week}</p>
            </div>
          </div>
        </div>

        {/* This Month */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="text-purple-600" size={18} />
            <h3 className="font-semibold text-purple-900">This Month</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-purple-600">New Users</p>
              <p className="text-xl font-bold text-purple-900">{metrics.users_month}</p>
            </div>
            <div>
              <p className="text-xs text-purple-600">New Listings</p>
              <p className="text-xl font-bold text-purple-900">{metrics.listings_month}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Moderation & Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Moderation Stats */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Shield className="text-gray-600" size={18} />
            Moderation Overview
          </h3>
          <div className="space-y-3">
            <Link href="/admin/reports?status=pending" className="flex items-center justify-between p-3 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors">
              <div className="flex items-center gap-3">
                <AlertTriangle className="text-orange-600" size={18} />
                <span className="text-gray-800">Pending Reports</span>
              </div>
              <span className="font-bold text-orange-600">{metrics.pending_reports}</span>
            </Link>
            <Link href="/admin/users?filter=banned" className="flex items-center justify-between p-3 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
              <div className="flex items-center gap-3">
                <Ban className="text-red-600" size={18} />
                <span className="text-gray-800">Banned Users</span>
              </div>
              <span className="font-bold text-red-600">{metrics.banned_users}</span>
            </Link>
            <Link href="/admin/users?filter=suspended" className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors">
              <div className="flex items-center gap-3">
                <Clock className="text-yellow-600" size={18} />
                <span className="text-gray-800">Suspended Users</span>
              </div>
              <span className="font-bold text-yellow-600">{metrics.suspended_users}</span>
            </Link>
          </div>
        </div>

        {/* Listing Stats */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Package className="text-gray-600" size={18} />
            Listing Breakdown
          </h3>
          <div className="space-y-3">
            <Link href="/admin/listings?status=active" className="flex items-center justify-between p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
              <div className="flex items-center gap-3">
                <Eye className="text-green-600" size={18} />
                <span className="text-gray-800">Active Listings</span>
              </div>
              <span className="font-bold text-green-600">{metrics.active_listings}</span>
            </Link>
            <Link href="/admin/listings?status=draft" className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="flex items-center gap-3">
                <FileText className="text-gray-600" size={18} />
                <span className="text-gray-800">Drafts</span>
              </div>
              <span className="font-bold text-gray-600">{metrics.draft_listings}</span>
            </Link>
            <Link href="/admin/listings?status=sold" className="flex items-center justify-between p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
              <div className="flex items-center gap-3">
                <DollarSign className="text-blue-600" size={18} />
                <span className="text-gray-800">Sold</span>
              </div>
              <span className="font-bold text-blue-600">{metrics.sold_listings}</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Activity & Top Sellers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="text-gray-600" size={18} />
            Recent Activity
          </h3>
          <div className="space-y-2">
            {metrics.recent_users?.slice(0, 3).map((user) => (
              <Link key={user.id} href={`/admin/users?search=${user.email}`} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <UserCheck className="text-blue-600" size={14} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{user.name || 'New User'}</p>
                    <p className="text-xs text-gray-500">Registered</p>
                  </div>
                </div>
                <span className="text-xs text-gray-400">{formatTime(user.created_at)}</span>
              </Link>
            ))}
            {metrics.recent_listings?.slice(0, 3).map((listing) => (
              <Link key={listing.id} href={`/listing/${listing.id}`} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                    <Package className="text-yellow-600" size={14} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 truncate max-w-[180px]">{listing.title}</p>
                    <p className="text-xs text-gray-500">New listing</p>
                  </div>
                </div>
                <span className="text-xs text-gray-400">{formatTime(listing.created_at)}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Top Sellers */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="text-gray-600" size={18} />
            Top Sellers
          </h3>
          {metrics.top_sellers?.length > 0 ? (
            <div className="space-y-3">
              {metrics.top_sellers.map((seller, index) => (
                <Link key={seller.id} href={`/admin/users?search=${seller.id}`} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors">
                  <div className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      index === 0 ? 'bg-yellow-400 text-yellow-900' :
                      index === 1 ? 'bg-gray-300 text-gray-700' :
                      index === 2 ? 'bg-orange-300 text-orange-800' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {index + 1}
                    </span>
                    {seller.avatar ? (
                      <img src={seller.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                        <Users className="text-gray-500" size={14} />
                      </div>
                    )}
                    <span className="font-medium text-gray-900">{seller.name || 'Unknown'}</span>
                  </div>
                  <span className="text-sm font-bold text-green-600">{seller.count} sales</span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm text-center py-4">No sales yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
