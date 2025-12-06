"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase";

export default function AdminDashboardSimple() {
  const [step, setStep] = useState("Starting...");
  const [user, setUser] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [adminCheckResult, setAdminCheckResult] = useState<any>(null);
  const router = useRouter();
  const supabase = supabaseBrowser();

  useEffect(() => {
    const runCheck = async () => {
      try {
        // Step 1: Check user
        setStep("Checking user...");
        console.log('[Simple Dashboard] Step 1: Checking user');
        const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();
        console.log('[Simple Dashboard] User result:', { user: authUser?.email, error: userError });
        setUser(authUser);
        
        if (!authUser) {
          setStep("No user - redirecting to login in 3 seconds");
          console.log('[Simple Dashboard] No user, will redirect');
          setTimeout(() => {
            console.log('[Simple Dashboard] Redirecting to login');
            router.push("/auth/login?next=/admin/dashboard-simple");
          }, 3000);
          return;
        }

        // Step 2: Check session
        setStep("Checking session...");
        console.log('[Simple Dashboard] Step 2: Checking session');
        const { data: { session: authSession } } = await supabase.auth.getSession();
        console.log('[Simple Dashboard] Session result:', { hasSession: !!authSession, hasToken: !!authSession?.access_token });
        setSession(authSession);

        if (!authSession?.access_token) {
          setStep("No session token - redirecting");
          setTimeout(() => router.push("/auth/login"), 3000);
          return;
        }

        // Step 3: Check admin status
        setStep("Checking admin status via API...");
        console.log('[Simple Dashboard] Step 3: Calling /api/is-admin');
        const adminRes = await fetch("/api/is-admin", {
          headers: {
            Authorization: `Bearer ${authSession.access_token}`,
          },
        });

        console.log('[Simple Dashboard] API response status:', adminRes.status);
        const adminData = await adminRes.json();
        console.log('[Simple Dashboard] API response data:', adminData);
        setAdminCheckResult(adminData);

        if (!adminData.isAdmin) {
          setStep("Not admin - redirecting home in 3 seconds");
          setTimeout(() => router.push("/"), 3000);
          return;
        }

        setStep("✅ All checks passed! You are admin.");

      } catch (err: any) {
        console.error('[Simple Dashboard] Error:', err);
        setStep(`Error: ${err.message}`);
      }
    };

    runCheck();
  }, [router, supabase]);

  return (
    <div className="max-w-5xl mx-auto mt-12 px-4">
      <h1 className="text-3xl font-bold mb-6">Simple Admin Dashboard Test</h1>
      
      <div className="bg-blue-50 border border-blue-200 p-4 rounded mb-4">
        <h2 className="font-bold mb-2">Current Step:</h2>
        <p className="text-lg">{step}</p>
      </div>

      <div className="bg-gray-50 border border-gray-200 p-4 rounded mb-4">
        <h2 className="font-bold mb-2">User Info:</h2>
        <pre className="text-xs overflow-auto">{JSON.stringify(user, null, 2)}</pre>
      </div>

      <div className="bg-gray-50 border border-gray-200 p-4 rounded mb-4">
        <h2 className="font-bold mb-2">Session Info:</h2>
        <pre className="text-xs overflow-auto">{JSON.stringify(session ? { hasToken: !!session.access_token, expiresAt: session.expires_at } : null, null, 2)}</pre>
      </div>

      <div className="bg-gray-50 border border-gray-200 p-4 rounded">
        <h2 className="font-bold mb-2">Admin Check Result:</h2>
        <pre className="text-xs overflow-auto">{JSON.stringify(adminCheckResult, null, 2)}</pre>
      </div>

      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
        <p className="text-sm">
          <strong>Instructions:</strong> Open browser console (F12) and look for logs starting with [Simple Dashboard]
        </p>
      </div>
    </div>
  );
}
