"use client";

import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function AdminDebugPage() {
  const [info, setInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClientComponentClient();

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const user = await getCurrentUser();
        const adminStatus = await isAdmin();
        
        // Check Supabase auth session directly
        const { data: { session } } = await supabase.auth.getSession();
        const { data: { user: authUser } } = await supabase.auth.getUser();
        
        // Direct query to admins table
        const { data: adminRecord, error: adminError } = await supabase
          .from('admins')
          .select('*')
          .eq('id', user?.id || 'none')
          .maybeSingle();

        // Get all admins (if you have permission)
        const { data: allAdmins, error: allAdminsError } = await supabase
          .from('admins')
          .select('*');

        // Check profile in database
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user?.id || 'none')
          .maybeSingle();

        setInfo({
          currentUser: user,
          authUser: authUser ? { 
            id: authUser.id, 
            email: authUser.email,
            user_metadata: authUser.user_metadata 
          } : null,
          sessionEmail: session?.user?.email,
          profile,
          profileError: profileError?.message,
          isAdmin: adminStatus,
          adminRecord,
          adminError: adminError?.message,
          allAdmins,
          allAdminsError: allAdminsError?.message,
        });
      } catch (err) {
        setInfo({ error: err instanceof Error ? err.message : String(err) });
      } finally {
        setLoading(false);
      }
    };
    checkStatus();
  }, [supabase]);

  if (loading) {
    return <div className="max-w-4xl mx-auto p-8">Loading...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Admin Debug Info</h1>
      
      <div className="bg-gray-50 p-4 rounded-lg">
        <pre className="text-xs overflow-auto">
          {JSON.stringify(info, null, 2)}
        </pre>
      </div>

      <div className="mt-6 space-y-4">
        <div className="p-4 bg-white rounded border">
          <h2 className="font-semibold mb-2">Current User (from getCurrentUser)</h2>
          <p>ID: {info?.currentUser?.id || 'Not logged in'}</p>
          <p>Email: {info?.currentUser?.email}</p>
          <p>Name: {info?.currentUser?.name}</p>
        </div>

        <div className="p-4 bg-yellow-50 rounded border border-yellow-200">
          <h2 className="font-semibold mb-2">Auth Session (from Supabase)</h2>
          <p>Session Email: {info?.sessionEmail || 'No session'}</p>
          <p>Auth User ID: {info?.authUser?.id}</p>
          <p>Auth Email: {info?.authUser?.email}</p>
          <p>Auth Metadata Name: {info?.authUser?.user_metadata?.name}</p>
        </div>

        <div className="p-4 bg-blue-50 rounded border border-blue-200">
          <h2 className="font-semibold mb-2">Profile (from database)</h2>
          <p>Profile ID: {info?.profile?.id}</p>
          <p>Profile Email: {info?.profile?.email}</p>
          <p>Profile Name: {info?.profile?.name}</p>
        </div>

        <div className="p-4 bg-white rounded border">
          <h2 className="font-semibold mb-2">Admin Check</h2>
          <p className="text-lg">
            Is Admin: <span className={info?.isAdmin ? "text-green-600 font-bold" : "text-red-600 font-bold"}>
              {info?.isAdmin ? "YES ✓" : "NO ✗"}
            </span>
          </p>
        </div>

        {info?.adminError && (
          <div className="p-4 bg-red-50 rounded border border-red-200">
            <h2 className="font-semibold mb-2 text-red-800">Admin Query Error</h2>
            <p className="text-red-600">{info.adminError}</p>
          </div>
        )}

        <div className="mt-4 p-4 bg-blue-50 rounded border border-blue-200">
          <h3 className="font-semibold mb-2">To make yourself admin:</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Go to Supabase SQL Editor</li>
            <li>Run this SQL:
              <div className="mt-2 p-2 bg-white rounded border font-mono text-xs overflow-x-auto">
                INSERT INTO public.admins (id) VALUES (&apos;{info?.currentUser?.id}&apos;) ON CONFLICT (id) DO NOTHING;
              </div>
            </li>
            <li>Refresh this page</li>
          </ol>
          
          <div className="mt-4 pt-4 border-t border-blue-300">
            <h3 className="font-semibold mb-2">Or if the account email is wrong:</h3>
            <p className="text-sm mb-2">Clear your session and login with the correct account:</p>
            <button
              onClick={() => {
                localStorage.clear();
                window.location.href = '/auth/logout';
              }}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Clear Session & Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
