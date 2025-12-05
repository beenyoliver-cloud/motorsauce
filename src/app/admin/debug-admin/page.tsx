"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";

export default function AdminDebugPage() {
  const [debug, setDebug] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const runDebug = async () => {
      const supabase = supabaseBrowser();
      
      // 1. Check getCurrentUser
      const currentUser = await getCurrentUser();
      
      // 2. Check supabase.auth.getUser
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      // 3. Direct query to admins table
      const { data: adminData, error: adminError } = await supabase
        .from('admins')
        .select('*')
        .eq('id', authUser?.id || 'none')
        .maybeSingle();
      
      // 4. Check isAdmin function
      const adminResult = await isAdmin();
      
      // 5. Get all admins (to see if table is readable)
      const { data: allAdmins, error: allAdminsError } = await supabase
        .from('admins')
        .select('*');
      
      setDebug({
        currentUser: currentUser ? {
          id: currentUser.id,
          email: currentUser.email,
          name: currentUser.name
        } : null,
        authUser: authUser ? {
          id: authUser.id,
          email: authUser.email
        } : null,
        adminQuery: {
          data: adminData,
          error: adminError?.message || null
        },
        isAdminResult: adminResult,
        allAdmins: allAdmins || [],
        allAdminsError: allAdminsError?.message || null
      });
      
      setLoading(false);
    };
    
    runDebug();
  }, []);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <h1 className="text-2xl font-bold mb-4">Admin Debug</h1>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Admin Debug Information</h1>
      
      <div className="space-y-6">
        {/* Current User */}
        <div className="bg-white border rounded-lg p-4">
          <h2 className="font-semibold text-lg mb-2">getCurrentUser() Result</h2>
          <pre className="bg-gray-50 p-3 rounded overflow-x-auto">
            {JSON.stringify(debug.currentUser, null, 2)}
          </pre>
        </div>

        {/* Auth User */}
        <div className="bg-white border rounded-lg p-4">
          <h2 className="font-semibold text-lg mb-2">supabase.auth.getUser() Result</h2>
          <pre className="bg-gray-50 p-3 rounded overflow-x-auto">
            {JSON.stringify(debug.authUser, null, 2)}
          </pre>
        </div>

        {/* Admin Query */}
        <div className="bg-white border rounded-lg p-4">
          <h2 className="font-semibold text-lg mb-2">Direct Admins Table Query</h2>
          <pre className="bg-gray-50 p-3 rounded overflow-x-auto">
            {JSON.stringify(debug.adminQuery, null, 2)}
          </pre>
          {debug.adminQuery.error && (
            <p className="text-red-600 mt-2 font-semibold">❌ Error querying admins table!</p>
          )}
          {!debug.adminQuery.error && !debug.adminQuery.data && (
            <p className="text-orange-600 mt-2 font-semibold">⚠️ You are NOT in the admins table</p>
          )}
          {debug.adminQuery.data && (
            <p className="text-green-600 mt-2 font-semibold">✅ You ARE in the admins table</p>
          )}
        </div>

        {/* isAdmin() Result */}
        <div className="bg-white border rounded-lg p-4">
          <h2 className="font-semibold text-lg mb-2">isAdmin() Function Result</h2>
          <p className="text-2xl font-bold">
            {debug.isAdminResult ? (
              <span className="text-green-600">✅ TRUE</span>
            ) : (
              <span className="text-red-600">❌ FALSE</span>
            )}
          </p>
        </div>

        {/* All Admins */}
        <div className="bg-white border rounded-lg p-4">
          <h2 className="font-semibold text-lg mb-2">All Admins in Table</h2>
          <pre className="bg-gray-50 p-3 rounded overflow-x-auto">
            {JSON.stringify(debug.allAdmins, null, 2)}
          </pre>
          {debug.allAdminsError && (
            <p className="text-red-600 mt-2">Error: {debug.allAdminsError}</p>
          )}
        </div>
      </div>

      {/* Console logs reminder */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="font-semibold mb-2">📋 Also check your browser console (F12)</p>
        <p className="text-sm text-gray-700">
          The isAdmin() function logs debug information. Look for [isAdmin] messages.
        </p>
      </div>
    </div>
  );
}
