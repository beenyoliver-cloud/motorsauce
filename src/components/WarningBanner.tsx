"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase";
import Link from "next/link";

interface WarningInfo {
  warning_count: number;
  last_warning_at: string | null;
}

export default function WarningBanner() {
  const [warningInfo, setWarningInfo] = useState<WarningInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkWarningStatus();
  }, []);

  async function checkWarningStatus() {
    try {
      const supabase = supabaseBrowser();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setLoading(false);
        return;
      }

      // Check if user has dismissed banner in this session
      const dismissedKey = `warning_banner_dismissed_${user.id}`;
      if (sessionStorage.getItem(dismissedKey)) {
        setDismissed(true);
        setLoading(false);
        return;
      }

      // Get user's warning status
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("warning_count, last_warning_at")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("Error fetching warning status:", error);
        setLoading(false);
        return;
      }

      if (profile && profile.warning_count > 0) {
        setWarningInfo({
          warning_count: profile.warning_count,
          last_warning_at: profile.last_warning_at,
        });
      }
    } catch (err) {
      console.error("Error checking warning status:", err);
    } finally {
      setLoading(false);
    }
  }

  function handleDismiss() {
    // Store dismissal in sessionStorage so it persists during session but not across sessions
    const supabase = supabaseBrowser();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        sessionStorage.setItem(`warning_banner_dismissed_${user.id}`, "true");
      }
    });
    setDismissed(true);
  }

  // Don't show if loading, no warnings, or dismissed
  if (loading || !warningInfo || dismissed) {
    return null;
  }

  const warningText = warningInfo.warning_count === 1 
    ? "You have 1 warning on your account" 
    : `You have ${warningInfo.warning_count} warnings on your account`;

  return (
    <div className="bg-orange-500 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold">
                {warningText}
              </p>
              <p className="text-sm text-orange-100">
                Please review our{" "}
                <Link href="/terms" className="underline hover:text-white">
                  terms of service
                </Link>
                . Further violations may result in account suspension or permanent ban.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link 
              href="/notifications" 
              className="text-sm bg-orange-600 hover:bg-orange-700 px-3 py-1.5 rounded-lg transition"
            >
              View Details
            </Link>
            <button 
              onClick={handleDismiss}
              className="p-1.5 hover:bg-orange-600 rounded-lg transition"
              aria-label="Dismiss warning"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
