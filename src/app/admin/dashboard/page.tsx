"use client";"use client";"use client";



import { useEffect, useState } from "react";import { useEffect, useState } from "react";import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import Link from "next/link";import { useRouter } from "next/navigation";import { useRouter } from "next/navigation";

import {

  Package,import Link from "next/link";import { Package, Users, DollarSign, BarChart3, Shield } from "lucide-react";

  Users,

  DollarSign,import { import { supabaseBrowser } from "@/lib/supabase";

  BarChart3,

  Shield,  Package, Users, DollarSign, BarChart3, Shield, TrendingUp, import { AdminNav, AdminBreadcrumb } from "@/components/AdminNav";

  TrendingUp,

  AlertTriangle,  AlertTriangle, Clock, UserCheck, FileText, Ban, Eye,

  Clock,

  UserCheck,  ArrowUpRightexport default function AdminDashboard() {

  FileText,

  Ban,} from "lucide-react";  const [metrics, setMetrics] = useState<{

  Eye,

  ArrowUpRight,import { supabaseBrowser } from "@/lib/supabase";    total_listings: number;

} from "lucide-react";

import { supabaseBrowser } from "@/lib/supabase";import { AdminNav, AdminBreadcrumb } from "@/components/AdminNav";    total_users: number;

import { AdminNav, AdminBreadcrumb } from "@/components/AdminNav";

    total_sales: number;

interface Metrics {

  total_listings: number;interface Metrics {  } | null>(null);

  total_users: number;

  total_sales: number;  total_listings: number;  const [loading, setLoading] = useState(true);

  active_listings: number;

  draft_listings: number;  total_users: number;  const [isAdmin, setIsAdmin] = useState(false);

  sold_listings: number;

  users_today: number;  total_sales: number;  const [error, setError] = useState<string | null>(null);

  listings_today: number;

  users_week: number;  active_listings: number;  const router = useRouter();

  listings_week: number;

  users_month: number;  draft_listings: number;  const supabase = supabaseBrowser();

  listings_month: number;

  pending_reports: number;  sold_listings: number;

  banned_users: number;

  suspended_users: number;  users_today: number;  useEffect(() => {

  top_sellers: Array<{ id: string; name: string; avatar: string; count: number }>;

  recent_users: Array<{ id: string; name: string; email: string; created_at: string }>;  listings_today: number;    const checkAdminAndFetchMetrics = async () => {

  recent_listings: Array<{ id: string; title: string; status: string; created_at: string }>;

  recent_reports: Array<{ id: string; reason: string; status: string; created_at: string }>;  users_week: number;      setLoading(true);

}

  listings_week: number;      setError(null);

export default function AdminDashboard() {

  const [metrics, setMetrics] = useState<Metrics | null>(null);  users_month: number;      try {

  const [loading, setLoading] = useState(true);

  const [isAdmin, setIsAdmin] = useState(false);  listings_month: number;        console.log('[AdminDashboard] Starting admin check...');

  const [error, setError] = useState<string | null>(null);

  const router = useRouter();  pending_reports: number;        

  const supabase = supabaseBrowser();

  banned_users: number;        // Check if user is logged in

  useEffect(() => {

    const checkAdminAndFetchMetrics = async () => {  suspended_users: number;        const { data: { user }, error: userError } = await supabase.auth.getUser();

      setLoading(true);

      setError(null);  top_sellers: Array<{ id: string; name: string; avatar: string; count: number }>;        console.log('[AdminDashboard] User check result:', { user: user?.email, error: userError?.message });

      try {

        const {  recent_users: Array<{ id: string; name: string; email: string; created_at: string }>;        

          data: { user },

          error: userError,  recent_listings: Array<{ id: string; title: string; status: string; created_at: string }>;        if (userError || !user) {

        } = await supabase.auth.getUser();

  recent_reports: Array<{ id: string; reason: string; status: string; created_at: string }>;          console.log('[AdminDashboard] No user found, redirecting to login');

        if (userError || !user) {

          router.push("/auth/login?next=/admin/dashboard");}          router.push("/auth/login?next=/admin/dashboard");

          return;

        }          return;



        const {export default function AdminDashboard() {        }

          data: { session },

        } = await supabase.auth.getSession();  const [metrics, setMetrics] = useState<Metrics | null>(null);



        if (!session?.access_token) {  const [loading, setLoading] = useState(true);        // Check if user is admin using API endpoint (bypasses RLS)

          setError("No access token. Please log in again.");

          setTimeout(() => router.push("/auth/login"), 2000);  const [isAdmin, setIsAdmin] = useState(false);        const { data: { session } } = await supabase.auth.getSession();

          return;

        }  const [error, setError] = useState<string | null>(null);        console.log('[AdminDashboard] Session check:', { hasSession: !!session, hasToken: !!session?.access_token });



        const adminRes = await fetch("/api/is-admin", {  const router = useRouter();        

          headers: { Authorization: `Bearer ${session.access_token}` },

        });  const supabase = supabaseBrowser();        if (!session?.access_token) {



        if (!adminRes.ok) {          console.log('[AdminDashboard] No access token');

          setError("Failed to verify admin status.");

          setTimeout(() => router.push("/"), 2000);  useEffect(() => {          setError("No access token. Please log in again.");

          return;

        }    const checkAdminAndFetchMetrics = async () => {          setTimeout(() => router.push("/auth/login"), 2000);



        const adminData = await adminRes.json();      setLoading(true);          return;



        if (!adminData.isAdmin) {      setError(null);        }

          setError("Access denied. Admin privileges required.");

          setTimeout(() => router.push("/"), 2000);      try {

          return;

        }        const { data: { user }, error: userError } = await supabase.auth.getUser();        console.log('[AdminDashboard] Calling /api/is-admin...');



        setIsAdmin(true);                const adminRes = await fetch("/api/is-admin", {



        const metricsRes = await fetch("/api/admin-metrics", {        if (userError || !user) {          headers: {

          headers: { Authorization: `Bearer ${session.access_token}` },

        });          router.push("/auth/login?next=/admin/dashboard");            Authorization: `Bearer ${session.access_token}`,



        if (metricsRes.ok) {          return;          },

          const data = await metricsRes.json();

          setMetrics(data);        }        });

        } else {

          setError("Failed to load metrics");

        }

      } catch (err) {        const { data: { session } } = await supabase.auth.getSession();        console.log('[AdminDashboard] API response status:', adminRes.status);

        setError(err instanceof Error ? err.message : "An error occurred");

        setTimeout(() => router.push("/"), 2000);        

      } finally {

        setLoading(false);        if (!session?.access_token) {        if (!adminRes.ok) {

      }

    };          setError("No access token. Please log in again.");          const errorText = await adminRes.text();

    checkAdminAndFetchMetrics();

  }, []);          setTimeout(() => router.push("/auth/login"), 2000);          console.error('[AdminDashboard] API error:', errorText);



  if (loading) {          return;          setError("Failed to verify admin status.");

    return (

      <div className="max-w-7xl mx-auto mt-8 px-4">        }          setTimeout(() => router.push("/"), 2000);

        <div className="bg-white rounded-xl border border-gray-200 p-8">

          <div className="flex items-center gap-3 mb-6">          return;

            <Shield className="text-yellow-600" size={32} />

            <h1 className="text-3xl font-bold text-black">Admin Dashboard</h1>        const adminRes = await fetch("/api/is-admin", {        }

          </div>

          <div className="animate-pulse grid grid-cols-1 md:grid-cols-4 gap-4">          headers: { Authorization: `Bearer ${session.access_token}` },

            {[...Array(8)].map((_, i) => (

              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>        });        const adminData = await adminRes.json();

            ))}

          </div>        console.log('[AdminDashboard] API response data:', adminData);

        </div>

      </div>        if (!adminRes.ok) {        

    );

  }          setError("Failed to verify admin status.");        if (!adminData.isAdmin) {



  if (error) {          setTimeout(() => router.push("/"), 2000);          console.log('[AdminDashboard] User is not admin, redirecting home');

    return (

      <div className="max-w-7xl mx-auto mt-8 px-4">          return;          setError("Access denied. Admin privileges required.");

        <div className="bg-red-50 border border-red-200 rounded-xl p-8">

          <h1 className="text-2xl font-bold text-red-800 mb-2">Access Denied</h1>        }          setTimeout(() => router.push("/"), 2000);

          <p className="text-red-600">{error}</p>

        </div>          return;

      </div>

    );        const adminData = await adminRes.json();        }

  }

        

  if (!isAdmin || !metrics) return null;

        if (!adminData.isAdmin) {        console.log('[AdminDashboard] Admin check passed! Loading dashboard...');

  const formatTime = (dateStr: string) => {

    const date = new Date(dateStr);          setError("Access denied. Admin privileges required.");        setIsAdmin(true);

    const now = new Date();

    const diff = now.getTime() - date.getTime();          setTimeout(() => router.push("/"), 2000);

    const mins = Math.floor(diff / 60000);

    const hours = Math.floor(diff / 3600000);          return;        // Fetch metrics with auth header

    const days = Math.floor(diff / 86400000);

        }        console.log('[AdminDashboard] Fetching metrics...');

    if (mins < 60) return `${mins}m ago`;

    if (hours < 24) return `${hours}h ago`;        const metricsRes = await fetch("/api/admin-metrics", {

    return `${days}d ago`;

  };        setIsAdmin(true);          headers: {



  return (            Authorization: `Bearer ${session.access_token}`,

    <div className="max-w-7xl mx-auto mt-8 px-4 pb-12">

      <AdminBreadcrumb current="Dashboard" />        const metricsRes = await fetch("/api/admin-metrics", {          },

      <AdminNav />

          headers: { Authorization: `Bearer ${session.access_token}` },        });

      {/* Header */}

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">        });        

        <div className="flex items-center justify-between">

          <div className="flex items-center gap-3">                console.log('[AdminDashboard] Metrics response status:', metricsRes.status);

            <Shield className="text-yellow-600" size={32} />

            <div>        if (metricsRes.ok) {        

              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>

              <p className="text-gray-600">Platform overview and quick actions</p>          const data = await metricsRes.json();        if (metricsRes.ok) {

            </div>

          </div>          setMetrics(data);          const data = await metricsRes.json();

          <div className="text-right text-sm text-gray-500">

            Last updated: {new Date().toLocaleTimeString()}        } else {          console.log('[AdminDashboard] Metrics loaded:', data);

          </div>

        </div>          setError("Failed to load metrics");          setMetrics(data);

      </div>

        }        } else {

      {/* Alert Banner for Pending Reports */}

      {metrics.pending_reports > 0 && (      } catch (err) {          const errorText = await metricsRes.text();

        <Link href="/admin/reports?status=pending" className="block mb-6">

          <div className="bg-orange-50 border-2 border-orange-300 rounded-xl p-4 flex items-center justify-between hover:bg-orange-100 transition-colors">        setError(err instanceof Error ? err.message : "An error occurred");          console.error('[AdminDashboard] Metrics error:', errorText);

            <div className="flex items-center gap-3">

              <AlertTriangle className="text-orange-600" size={24} />        setTimeout(() => router.push("/"), 2000);          setError("Failed to load metrics");

              <div>

                <span className="font-bold text-orange-800">      } finally {        }

                  {metrics.pending_reports} pending reports

                </span>        setLoading(false);      } catch (err) {

                <span className="text-orange-600 ml-2">require review</span>

              </div>      }        setError(err instanceof Error ? err.message : "An error occurred");

            </div>

            <ArrowUpRight className="text-orange-600" size={20} />    };        setTimeout(() => router.push("/"), 2000);

          </div>

        </Link>    checkAdminAndFetchMetrics();      } finally {

      )}

  }, []);        setLoading(false);

      {/* Main Stats Grid */}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">      }

        {/* Total Users */}

        <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg transition">  if (loading) {    };

          <div className="flex items-center justify-between mb-3">

            <div className="p-2 bg-blue-100 rounded-lg">    return (    checkAdminAndFetchMetrics();

              <Users className="text-blue-600" size={20} />

            </div>      <div className="max-w-7xl mx-auto mt-8 px-4">    // eslint-disable-next-line react-hooks/exhaustive-deps

            {metrics.users_today > 0 && (

              <span className="flex items-center text-green-600 text-sm font-medium">        <div className="bg-white rounded-xl border border-gray-200 p-8">  }, []); // Only run once on mount

                <ArrowUpRight size={14} /> +{metrics.users_today}

              </span>          <div className="flex items-center gap-3 mb-6">

            )}

          </div>            <Shield className="text-yellow-600" size={32} />  if (loading) {

          <h3 className="text-gray-600 text-xs font-medium mb-1">Total Users</h3>

          <p className="text-2xl font-bold text-gray-900">            <h1 className="text-3xl font-bold text-black">Admin Dashboard</h1>    return (

            {metrics.total_users.toLocaleString()}

          </p>          </div>      <div className="max-w-5xl mx-auto mt-12 px-4">

        </div>

          <div className="animate-pulse grid grid-cols-1 md:grid-cols-4 gap-4">        <div className="bg-white rounded-xl border border-gray-200 p-8">

        {/* Active Listings */}

        <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg transition">            {[...Array(8)].map((_, i) => (          <div className="flex items-center gap-3 mb-6">

          <div className="flex items-center justify-between mb-3">

            <div className="p-2 bg-yellow-100 rounded-lg">              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>            <Shield className="text-yellow-600" size={32} />

              <Package className="text-yellow-600" size={20} />

            </div>            ))}            <h1 className="text-3xl font-bold text-black">Admin Dashboard</h1>

            {metrics.listings_today > 0 && (

              <span className="flex items-center text-green-600 text-sm font-medium">          </div>          </div>

                <ArrowUpRight size={14} /> +{metrics.listings_today}

              </span>        </div>          <div className="animate-pulse space-y-4">

            )}

          </div>      </div>            <div className="h-32 bg-gray-200 rounded-lg"></div>

          <h3 className="text-gray-600 text-xs font-medium mb-1">Active Listings</h3>

          <p className="text-2xl font-bold text-gray-900">    );            <div className="h-32 bg-gray-200 rounded-lg"></div>

            {metrics.active_listings.toLocaleString()}

          </p>  }            <div className="h-32 bg-gray-200 rounded-lg"></div>

        </div>

          </div>

        {/* Total Sales */}

        <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg transition">  if (error) {        </div>

          <div className="flex items-center justify-between mb-3">

            <div className="p-2 bg-green-100 rounded-lg">    return (      </div>

              <DollarSign className="text-green-600" size={20} />

            </div>      <div className="max-w-7xl mx-auto mt-8 px-4">    );

          </div>

          <h3 className="text-gray-600 text-xs font-medium mb-1">Total Sales</h3>        <div className="bg-red-50 border border-red-200 rounded-xl p-8">  }

          <p className="text-2xl font-bold text-gray-900">

            {metrics.total_sales.toLocaleString()}          <h1 className="text-2xl font-bold text-red-800 mb-2">Access Denied</h1>

          </p>

        </div>          <p className="text-red-600">{error}</p>  if (error) {



        {/* Sold Items */}        </div>    return (

        <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg transition">

          <div className="flex items-center justify-between mb-3">      </div>      <div className="max-w-5xl mx-auto mt-12 px-4">

            <div className="p-2 bg-purple-100 rounded-lg">

              <TrendingUp className="text-purple-600" size={20} />    );        <div className="bg-red-50 border border-red-200 rounded-xl p-8">

            </div>

          </div>  }          <h1 className="text-2xl font-bold text-red-800 mb-2">Access Denied</h1>

          <h3 className="text-gray-600 text-xs font-medium mb-1">Items Sold</h3>

          <p className="text-2xl font-bold text-gray-900">          <p className="text-red-600">{error}</p>

            {metrics.sold_listings.toLocaleString()}

          </p>  if (!isAdmin || !metrics) return null;        </div>

        </div>

      </div>      </div>



      {/* Time Period Stats */}  const formatTime = (dateStr: string) => {    );

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">

        {/* Today */}    const date = new Date(dateStr);  }

        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200 p-5">

          <div className="flex items-center gap-2 mb-3">    const now = new Date();

            <Clock className="text-blue-600" size={18} />

            <h3 className="font-semibold text-blue-900">Today</h3>    const diff = now.getTime() - date.getTime();  if (!isAdmin) {

          </div>

          <div className="grid grid-cols-2 gap-3">    const mins = Math.floor(diff / 60000);    return null;

            <div>

              <p className="text-xs text-blue-600">New Users</p>    const hours = Math.floor(diff / 3600000);  }

              <p className="text-xl font-bold text-blue-900">{metrics.users_today}</p>

            </div>    const days = Math.floor(diff / 86400000);

            <div>

              <p className="text-xs text-blue-600">New Listings</p>      return (

              <p className="text-xl font-bold text-blue-900">{metrics.listings_today}</p>

            </div>    if (mins < 60) return `${mins}m ago`;    <div className="max-w-5xl mx-auto mt-12 px-4 pb-12">

          </div>

        </div>    if (hours < 24) return `${hours}h ago`;      <AdminBreadcrumb current="Dashboard" />



        {/* This Week */}    return `${days}d ago`;      <AdminNav />

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200 p-5">

          <div className="flex items-center gap-2 mb-3">  };      

            <BarChart3 className="text-green-600" size={18} />

            <h3 className="font-semibold text-green-900">This Week</h3>      <div className="bg-white rounded-xl border border-gray-200 p-8 mb-6">

          </div>

          <div className="grid grid-cols-2 gap-3">  return (        <div className="flex items-center gap-3 mb-2">

            <div>

              <p className="text-xs text-green-600">New Users</p>    <div className="max-w-7xl mx-auto mt-8 px-4 pb-12">          <Shield className="text-yellow-600" size={32} />

              <p className="text-xl font-bold text-green-900">{metrics.users_week}</p>

            </div>      <AdminBreadcrumb current="Dashboard" />          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>

            <div>

              <p className="text-xs text-green-600">New Listings</p>      <AdminNav />        </div>

              <p className="text-xl font-bold text-green-900">{metrics.listings_week}</p>

            </div>              <p className="text-gray-600">Monitor platform metrics and activity</p>

          </div>

        </div>      {/* Header */}      </div>



        {/* This Month */}      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200 p-5">

          <div className="flex items-center gap-2 mb-3">        <div className="flex items-center justify-between">      {/* Metrics Cards */}

            <TrendingUp className="text-purple-600" size={18} />

            <h3 className="font-semibold text-purple-900">This Month</h3>          <div className="flex items-center gap-3">      {metrics ? (

          </div>

          <div className="grid grid-cols-2 gap-3">            <Shield className="text-yellow-600" size={32} />        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            <div>

              <p className="text-xs text-purple-600">New Users</p>            <div>          {/* Total Parts Listed */}

              <p className="text-xl font-bold text-purple-900">{metrics.users_month}</p>

            </div>              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>          <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition">

            <div>

              <p className="text-xs text-purple-600">New Listings</p>              <p className="text-gray-600">Platform overview and quick actions</p>            <div className="flex items-center justify-between mb-4">

              <p className="text-xl font-bold text-purple-900">{metrics.listings_month}</p>

            </div>            </div>              <div className="p-3 bg-yellow-100 rounded-lg">

          </div>

        </div>          </div>                <Package className="text-yellow-600" size={24} />

      </div>

          <div className="text-right text-sm text-gray-500">              </div>

      {/* Moderation & Listing Stats */}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">            Last updated: {new Date().toLocaleTimeString()}              <BarChart3 className="text-gray-400" size={20} />

        {/* Moderation Stats */}

        <div className="bg-white rounded-xl border border-gray-200 p-5">          </div>            </div>

          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">

            <Shield className="text-gray-600" size={18} />        </div>            <h3 className="text-gray-600 text-sm font-medium mb-1">Total Parts Listed</h3>

            Moderation Overview

          </h3>      </div>            <p className="text-3xl font-bold text-gray-900">{metrics.total_listings.toLocaleString()}</p>

          <div className="space-y-3">

            <Link          </div>

              href="/admin/reports?status=pending"

              className="flex items-center justify-between p-3 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"      {/* Alert Banner for Pending Reports */}

            >

              <div className="flex items-center gap-3">      {metrics.pending_reports > 0 && (          {/* Total Users */}

                <AlertTriangle className="text-orange-600" size={18} />

                <span className="text-gray-800">Pending Reports</span>        <Link href="/admin/reports?status=pending" className="block mb-6">          <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition">

              </div>

              <span className="font-bold text-orange-600">{metrics.pending_reports}</span>          <div className="bg-orange-50 border-2 border-orange-300 rounded-xl p-4 flex items-center justify-between hover:bg-orange-100 transition-colors">            <div className="flex items-center justify-between mb-4">

            </Link>

            <Link            <div className="flex items-center gap-3">              <div className="p-3 bg-blue-100 rounded-lg">

              href="/admin/users?filter=banned"

              className="flex items-center justify-between p-3 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"              <AlertTriangle className="text-orange-600" size={24} />                <Users className="text-blue-600" size={24} />

            >

              <div className="flex items-center gap-3">              <div>              </div>

                <Ban className="text-red-600" size={18} />

                <span className="text-gray-800">Banned Users</span>                <span className="font-bold text-orange-800">{metrics.pending_reports} pending reports</span>              <BarChart3 className="text-gray-400" size={20} />

              </div>

              <span className="font-bold text-red-600">{metrics.banned_users}</span>                <span className="text-orange-600 ml-2">require review</span>            </div>

            </Link>

            <Link              </div>            <h3 className="text-gray-600 text-sm font-medium mb-1">Total Users</h3>

              href="/admin/users?filter=suspended"

              className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors"            </div>            <p className="text-3xl font-bold text-gray-900">{metrics.total_users.toLocaleString()}</p>

            >

              <div className="flex items-center gap-3">            <ArrowUpRight className="text-orange-600" size={20} />          </div>

                <Clock className="text-yellow-600" size={18} />

                <span className="text-gray-800">Suspended Users</span>          </div>

              </div>

              <span className="font-bold text-yellow-600">{metrics.suspended_users}</span>        </Link>          {/* Total Sales */}

            </Link>

          </div>      )}          <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition">

        </div>

            <div className="flex items-center justify-between mb-4">

        {/* Listing Stats */}

        <div className="bg-white rounded-xl border border-gray-200 p-5">      {/* Main Stats Grid */}              <div className="p-3 bg-green-100 rounded-lg">

          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">

            <Package className="text-gray-600" size={18} />      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">                <DollarSign className="text-green-600" size={24} />

            Listing Breakdown

          </h3>        {/* Total Users */}              </div>

          <div className="space-y-3">

            <Link        <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg transition">              <BarChart3 className="text-gray-400" size={20} />

              href="/admin/listings?status=active"

              className="flex items-center justify-between p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"          <div className="flex items-center justify-between mb-3">            </div>

            >

              <div className="flex items-center gap-3">            <div className="p-2 bg-blue-100 rounded-lg">            <h3 className="text-gray-600 text-sm font-medium mb-1">Total Sales</h3>

                <Eye className="text-green-600" size={18} />

                <span className="text-gray-800">Active Listings</span>              <Users className="text-blue-600" size={20} />            <p className="text-3xl font-bold text-gray-900">{metrics.total_sales.toLocaleString()}</p>

              </div>

              <span className="font-bold text-green-600">{metrics.active_listings}</span>            </div>          </div>

            </Link>

            <Link            {metrics.users_today > 0 && (        </div>

              href="/admin/listings?status=draft"

              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"              <span className="flex items-center text-green-600 text-sm font-medium">      ) : (

            >

              <div className="flex items-center gap-3">                <ArrowUpRight size={14} /> +{metrics.users_today}        <div className="bg-white rounded-xl border border-gray-200 p-8">

                <FileText className="text-gray-600" size={18} />

                <span className="text-gray-800">Drafts</span>              </span>          <p className="text-gray-600">Loading metrics...</p>

              </div>

              <span className="font-bold text-gray-600">{metrics.draft_listings}</span>            )}        </div>

            </Link>

            <Link          </div>      )}

              href="/admin/listings?status=sold"

              className="flex items-center justify-between p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"          <h3 className="text-gray-600 text-xs font-medium mb-1">Total Users</h3>    </div>

            >

              <div className="flex items-center gap-3">          <p className="text-2xl font-bold text-gray-900">{metrics.total_users.toLocaleString()}</p>  );

                <DollarSign className="text-blue-600" size={18} />

                <span className="text-gray-800">Sold</span>        </div>}

              </div>

              <span className="font-bold text-blue-600">{metrics.sold_listings}</span>

            </Link>        {/* Active Listings */}

          </div>        <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg transition">

        </div>          <div className="flex items-center justify-between mb-3">

      </div>            <div className="p-2 bg-yellow-100 rounded-lg">

              <Package className="text-yellow-600" size={20} />

      {/* Recent Activity & Top Sellers */}            </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">            {metrics.listings_today > 0 && (

        {/* Recent Activity */}              <span className="flex items-center text-green-600 text-sm font-medium">

        <div className="bg-white rounded-xl border border-gray-200 p-5">                <ArrowUpRight size={14} /> +{metrics.listings_today}

          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">              </span>

            <Clock className="text-gray-600" size={18} />            )}

            Recent Activity          </div>

          </h3>          <h3 className="text-gray-600 text-xs font-medium mb-1">Active Listings</h3>

          <div className="space-y-2">          <p className="text-2xl font-bold text-gray-900">{metrics.active_listings.toLocaleString()}</p>

            {metrics.recent_users?.slice(0, 3).map((user) => (        </div>

              <Link

                key={user.id}        {/* Total Sales */}

                href={`/admin/users?search=${user.email}`}        <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg transition">

                className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors"          <div className="flex items-center justify-between mb-3">

              >            <div className="p-2 bg-green-100 rounded-lg">

                <div className="flex items-center gap-2">              <DollarSign className="text-green-600" size={20} />

                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">            </div>

                    <UserCheck className="text-blue-600" size={14} />          </div>

                  </div>          <h3 className="text-gray-600 text-xs font-medium mb-1">Total Sales</h3>

                  <div>          <p className="text-2xl font-bold text-gray-900">{metrics.total_sales.toLocaleString()}</p>

                    <p className="text-sm font-medium text-gray-900">        </div>

                      {user.name || "New User"}

                    </p>        {/* Sold Items */}

                    <p className="text-xs text-gray-500">Registered</p>        <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg transition">

                  </div>          <div className="flex items-center justify-between mb-3">

                </div>            <div className="p-2 bg-purple-100 rounded-lg">

                <span className="text-xs text-gray-400">{formatTime(user.created_at)}</span>              <TrendingUp className="text-purple-600" size={20} />

              </Link>            </div>

            ))}          </div>

            {metrics.recent_listings?.slice(0, 3).map((listing) => (          <h3 className="text-gray-600 text-xs font-medium mb-1">Items Sold</h3>

              <Link          <p className="text-2xl font-bold text-gray-900">{metrics.sold_listings.toLocaleString()}</p>

                key={listing.id}        </div>

                href={`/listing/${listing.id}`}      </div>

                className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors"

              >      {/* Time Period Stats */}

                <div className="flex items-center gap-2">      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">

                  <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">        {/* Today */}

                    <Package className="text-yellow-600" size={14} />        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200 p-5">

                  </div>          <div className="flex items-center gap-2 mb-3">

                  <div>            <Clock className="text-blue-600" size={18} />

                    <p className="text-sm font-medium text-gray-900 truncate max-w-[180px]">            <h3 className="font-semibold text-blue-900">Today</h3>

                      {listing.title}          </div>

                    </p>          <div className="grid grid-cols-2 gap-3">

                    <p className="text-xs text-gray-500">New listing</p>            <div>

                  </div>              <p className="text-xs text-blue-600">New Users</p>

                </div>              <p className="text-xl font-bold text-blue-900">{metrics.users_today}</p>

                <span className="text-xs text-gray-400">{formatTime(listing.created_at)}</span>            </div>

              </Link>            <div>

            ))}              <p className="text-xs text-blue-600">New Listings</p>

          </div>              <p className="text-xl font-bold text-blue-900">{metrics.listings_today}</p>

        </div>            </div>

          </div>

        {/* Top Sellers */}        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">

          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">        {/* This Week */}

            <TrendingUp className="text-gray-600" size={18} />        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200 p-5">

            Top Sellers          <div className="flex items-center gap-2 mb-3">

          </h3>            <BarChart3 className="text-green-600" size={18} />

          {metrics.top_sellers?.length > 0 ? (            <h3 className="font-semibold text-green-900">This Week</h3>

            <div className="space-y-3">          </div>

              {metrics.top_sellers.map((seller, index) => (          <div className="grid grid-cols-2 gap-3">

                <Link            <div>

                  key={seller.id}              <p className="text-xs text-green-600">New Users</p>

                  href={`/admin/users?search=${seller.id}`}              <p className="text-xl font-bold text-green-900">{metrics.users_week}</p>

                  className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors"            </div>

                >            <div>

                  <div className="flex items-center gap-3">              <p className="text-xs text-green-600">New Listings</p>

                    <span              <p className="text-xl font-bold text-green-900">{metrics.listings_week}</p>

                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${            </div>

                        index === 0          </div>

                          ? "bg-yellow-400 text-yellow-900"        </div>

                          : index === 1

                          ? "bg-gray-300 text-gray-700"        {/* This Month */}

                          : index === 2        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200 p-5">

                          ? "bg-orange-300 text-orange-800"          <div className="flex items-center gap-2 mb-3">

                          : "bg-gray-100 text-gray-600"            <TrendingUp className="text-purple-600" size={18} />

                      }`}            <h3 className="font-semibold text-purple-900">This Month</h3>

                    >          </div>

                      {index + 1}          <div className="grid grid-cols-2 gap-3">

                    </span>            <div>

                    {seller.avatar ? (              <p className="text-xs text-purple-600">New Users</p>

                      <img              <p className="text-xl font-bold text-purple-900">{metrics.users_month}</p>

                        src={seller.avatar}            </div>

                        alt=""            <div>

                        className="w-8 h-8 rounded-full object-cover"              <p className="text-xs text-purple-600">New Listings</p>

                      />              <p className="text-xl font-bold text-purple-900">{metrics.listings_month}</p>

                    ) : (            </div>

                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">          </div>

                        <Users className="text-gray-500" size={14} />        </div>

                      </div>      </div>

                    )}

                    <span className="font-medium text-gray-900">      {/* Moderation & Quick Links */}

                      {seller.name || "Unknown"}      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">

                    </span>        {/* Moderation Stats */}

                  </div>        <div className="bg-white rounded-xl border border-gray-200 p-5">

                  <span className="text-sm font-bold text-green-600">{seller.count} sales</span>          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">

                </Link>            <Shield className="text-gray-600" size={18} />

              ))}            Moderation Overview

            </div>          </h3>

          ) : (          <div className="space-y-3">

            <p className="text-gray-500 text-sm text-center py-4">No sales yet</p>            <Link href="/admin/reports?status=pending" className="flex items-center justify-between p-3 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors">

          )}              <div className="flex items-center gap-3">

        </div>                <AlertTriangle className="text-orange-600" size={18} />

      </div>                <span className="text-gray-800">Pending Reports</span>

    </div>              </div>

  );              <span className="font-bold text-orange-600">{metrics.pending_reports}</span>

}            </Link>

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
