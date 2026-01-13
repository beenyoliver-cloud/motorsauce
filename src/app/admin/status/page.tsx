"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Shield, CheckCircle, XCircle, AlertCircle } from "lucide-react";

export default function AdminStatusPage() {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClientComponentClient();

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const { data: { user } } = await supabase.auth.getUser();

        let isInAdminsTable = false;
        let adminRecord = null;

        if (user) {
          const { data, error } = await supabase
            .from('admins')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();
          
          isInAdminsTable = !!data && !error;
          adminRecord = data;
        }

        setStatus({
          hasSession: !!session,
          hasUser: !!user,
          userEmail: user?.email || null,
          userId: user?.id || null,
          isInAdminsTable,
          adminRecord,
        });
      } catch (err) {
        console.error('Status check error:', err);
      } finally {
        setLoading(false);
      }
    };

    checkStatus();
  }, [supabase]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto mt-12 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-xl border border-gray-200 p-8">
          <p>Checking status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto mt-12 px-4 sm:px-6 lg:px-8 pb-12">
      <div className="bg-white rounded-xl border border-gray-200 p-8">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="text-yellow-600" size={32} />
          <h1 className="text-3xl font-bold text-black">Admin Status Check</h1>
        </div>

        <div className="space-y-4">
          {/* Session Status */}
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
            {status?.hasSession ? (
              <CheckCircle className="text-green-600" size={24} />
            ) : (
              <XCircle className="text-red-600" size={24} />
            )}
            <div>
              <p className="font-semibold text-black">Session Status</p>
              <p className="text-sm text-gray-600">
                {status?.hasSession ? "✓ Active session" : "✗ No active session"}
              </p>
            </div>
          </div>

          {/* User Status */}
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
            {status?.hasUser ? (
              <CheckCircle className="text-green-600" size={24} />
            ) : (
              <XCircle className="text-red-600" size={24} />
            )}
            <div className="flex-1">
              <p className="font-semibold text-black">User Status</p>
              {status?.hasUser ? (
                <>
                  <p className="text-sm text-gray-600">Email: {status.userEmail}</p>
                  <p className="text-xs text-gray-500 font-mono">{status.userId}</p>
                </>
              ) : (
                <p className="text-sm text-gray-600">✗ Not logged in</p>
              )}
            </div>
          </div>

          {/* Admin Status */}
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
            {status?.isInAdminsTable ? (
              <CheckCircle className="text-green-600" size={24} />
            ) : (
              <XCircle className="text-red-600" size={24} />
            )}
            <div>
              <p className="font-semibold text-black">Admin Privileges</p>
              <p className="text-sm text-gray-600">
                {status?.isInAdminsTable 
                  ? "✓ User is in admins table" 
                  : "✗ User is NOT in admins table"}
              </p>
            </div>
          </div>
        </div>

        {/* Action Required */}
        <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-yellow-600 mt-1" size={20} />
            <div>
              <p className="font-semibold text-yellow-800 mb-2">Next Steps:</p>
              {!status?.hasSession ? (
                <ol className="list-decimal list-inside space-y-1 text-sm text-yellow-700">
                  <li>You need to log in first</li>
                  <li>Go to <a href="/auth/login" className="underline">/auth/login</a></li>
                </ol>
              ) : !status?.isInAdminsTable ? (
                <ol className="list-decimal list-inside space-y-1 text-sm text-yellow-700">
                  <li>Run the SQL script: <code className="bg-yellow-100 px-1 rounded">sql/setup_admin_dashboard.sql</code></li>
                  <li>Go to Supabase SQL Editor</li>
                  <li>Paste and run the script</li>
                  <li>Refresh this page</li>
                </ol>
              ) : (
                <p className="text-sm text-green-700">
                  ✓ All set! You can access the <a href="/admin/dashboard" className="underline font-semibold">Admin Dashboard</a>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Debug Info */}
        <details className="mt-6">
          <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
            Show raw debug info
          </summary>
          <pre className="mt-2 p-4 bg-gray-900 text-green-400 text-xs rounded-lg overflow-auto">
            {JSON.stringify(status, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  );
}
