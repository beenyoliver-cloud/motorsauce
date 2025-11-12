"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { logout } from "@/lib/auth";

export default function LogoutPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const doLogout = async () => {
      try {
        await logout();
        // Dispatch event to clear UI
        window.dispatchEvent(new Event("ms:auth"));
        // Clear any cached data
        localStorage.clear();
        // Small delay to ensure everything is cleared
        await new Promise(resolve => setTimeout(resolve, 100));
        // Redirect to login
        router.replace("/auth/login");
      } catch (err) {
        console.error("Logout error:", err);
        setError(err instanceof Error ? err.message : "Failed to logout");
        // Still redirect even if there's an error
        setTimeout(() => router.replace("/auth/login"), 1000);
      }
    };
    doLogout();
  }, [router]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-red-600">Error: {error}</p>
        <p className="text-gray-600">Redirecting...</p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p>Logging out...</p>
    </div>
  );
}
