"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Package, Users, DollarSign, BarChart3, Shield } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase";

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState<{
    total_listings: number;
    total_users: number;
    total_sales: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = supabaseBrowser();

  useEffect(() => {
    const checkAdminAndFetchMetrics = async () => {
      setLoading(true);
      setError(null);
      try {
        console.log('[AdminDashboard] Starting admin check...');
        
        // Check if user is logged in
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        console.log('[AdminDashboard] User check result:', { user: user?.email, error: userError?.message });
        
        if (userError || !user) {
          console.log('[AdminDashboard] No user found, redirecting to login');
          router.push("/auth/login?next=/admin/dashboard");
          return;
        }

        // Check if user is admin using API endpoint (bypasses RLS)
        const { data: { session } } = await supabase.auth.getSession();
        console.log('[AdminDashboard] Session check:', { hasSession: !!session, hasToken: !!session?.access_token });
        
        if (!session?.access_token) {
          console.log('[AdminDashboard] No access token');
          setError("No access token. Please log in again.");
          setTimeout(() => router.push("/auth/login"), 2000);
          return;
        }

        console.log('[AdminDashboard] Calling /api/is-admin...');
        const adminRes = await fetch("/api/is-admin", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        console.log('[AdminDashboard] API response status:', adminRes.status);

        if (!adminRes.ok) {
          const errorText = await adminRes.text();
          console.error('[AdminDashboard] API error:', errorText);
          setError("Failed to verify admin status.");
          setTimeout(() => router.push("/"), 2000);
          return;
        }

        const adminData = await adminRes.json();
        console.log('[AdminDashboard] API response data:', adminData);
        
        if (!adminData.isAdmin) {
          console.log('[AdminDashboard] User is not admin, redirecting home');
          setError("Access denied. Admin privileges required.");
          setTimeout(() => router.push("/"), 2000);
          return;
        }

        console.log('[AdminDashboard] Admin check passed! Loading dashboard...');
        setIsAdmin(true);

        // Fetch metrics
        const res = await fetch("/api/admin-metrics");
        if (res.ok) {
          const data = await res.json();
          setMetrics(data);
        } else {
          setError("Failed to load metrics");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
        setTimeout(() => router.push("/"), 2000);
      } finally {
        setLoading(false);
      }
    };
    checkAdminAndFetchMetrics();
  }, [router, supabase]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto mt-12 px-4">
        <div className="bg-white rounded-xl border border-gray-200 p-8">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="text-yellow-600" size={32} />
            <h1 className="text-3xl font-bold text-black">Admin Dashboard</h1>
          </div>
          <div className="animate-pulse space-y-4">
            <div className="h-32 bg-gray-200 rounded-lg"></div>
            <div className="h-32 bg-gray-200 rounded-lg"></div>
            <div className="h-32 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-5xl mx-auto mt-12 px-4">
        <div className="bg-red-50 border border-red-200 rounded-xl p-8">
          <h1 className="text-2xl font-bold text-red-800 mb-2">Access Denied</h1>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="max-w-5xl mx-auto mt-12 px-4 pb-12">
      <div className="bg-white rounded-xl border border-gray-200 p-8 mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="text-yellow-600" size={32} />
          <h1 className="text-3xl font-bold text-black">Admin Dashboard</h1>
        </div>
        <p className="text-gray-600">Monitor platform metrics and activity</p>
      </div>

      {metrics ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Total Parts Listed */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Package className="text-yellow-600" size={24} />
              </div>
              <BarChart3 className="text-gray-300" size={20} />
            </div>
            <h3 className="text-gray-600 text-sm font-medium mb-1">Total Parts Listed</h3>
            <p className="text-3xl font-bold text-black">{metrics.total_listings.toLocaleString()}</p>
          </div>

          {/* Total Users */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="text-blue-600" size={24} />
              </div>
              <BarChart3 className="text-gray-300" size={20} />
            </div>
            <h3 className="text-gray-600 text-sm font-medium mb-1">Total Users</h3>
            <p className="text-3xl font-bold text-black">{metrics.total_users.toLocaleString()}</p>
          </div>

          {/* Total Sales */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <DollarSign className="text-green-600" size={24} />
              </div>
              <BarChart3 className="text-gray-300" size={20} />
            </div>
            <h3 className="text-gray-600 text-sm font-medium mb-1">Total Sales</h3>
            <p className="text-3xl font-bold text-black">{metrics.total_sales.toLocaleString()}</p>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-8">
          <p className="text-gray-600">Loading metrics...</p>
        </div>
      )}
    </div>
  );
}
