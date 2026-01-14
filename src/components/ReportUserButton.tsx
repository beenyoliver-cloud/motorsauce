"use client";

import { useEffect, useState } from "react";
import { Flag, X } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase";

interface ReportUserButtonProps {
  sellerName: string;
  sellerId: string;
}

export default function ReportUserButton({ sellerName, sellerId }: ReportUserButtonProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("fraud");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [toastOpen, setToastOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");

  // Get current user ID to prevent self-reporting
  useEffect(() => {
    async function fetchCurrentUser() {
      const supabase = supabaseBrowser();
      const { data: { session } } = await supabase.auth.getSession();
      setCurrentUserId(session?.user?.id || null);
    }
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (!toastOpen) return;
    const t = setTimeout(() => setToastOpen(false), 4000);
    return () => clearTimeout(t);
  }, [toastOpen]);

  async function submitReport(e: React.FormEvent) {
    e.preventDefault();
    
    if (!details.trim() || details.trim().length < 10) {
      setToastMsg("Please provide more details (at least 10 characters)");
      setToastType("error");
      setToastOpen(true);
      return;
    }

    setSubmitting(true);

    try {
      const supabase = supabaseBrowser();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setToastMsg("Please sign in to submit a report");
        setToastType("error");
        setToastOpen(true);
        setSubmitting(false);
        return;
      }

      const res = await fetch("/api/reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          reported_user_id: sellerId,
          reported_user_name: sellerName,
          reason,
          details: details.trim(),
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to submit report");
      }

      setOpen(false);
      setReason("fraud");
      setDetails("");
      setToastMsg(`Thank you. Your report about ${sellerName} has been submitted to our team for review.`);
      setToastType("success");
      setToastOpen(true);
    } catch (err) {
      console.error("Failed to submit report:", err);
      setToastMsg(err instanceof Error ? err.message : "Failed to submit report");
      setToastType("error");
      setToastOpen(true);
    } finally {
      setSubmitting(false);
    }
  }

  // Don't show report button if user is trying to report themselves
  if (currentUserId && currentUserId === sellerId) {
    return null;
  }

  return (
    <>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex-1 md:flex-none inline-flex items-center justify-center rounded-md px-3 py-2 border border-red-300 bg-red-50 text-black hover:bg-red-100 text-sm font-medium transition"
      >
        <Flag className="h-4 w-4 mr-2 text-red-600" /> Report user
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center" aria-modal="true" role="dialog">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="relative z-[61] w-full max-w-md rounded-xl bg-white shadow-xl border border-red-200 overflow-hidden">
            <div className="flex items-center justify-between bg-red-600 px-4 py-3">
              <h3 className="text-lg font-semibold text-white">Report {sellerName}</h3>
              <button
                type="button"
                className="p-1 rounded hover:bg-red-700 text-white"
                onClick={() => setOpen(false)}
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={submitReport} className="grid gap-4 p-5 text-black">
              <label className="grid gap-1">
                <span className="text-sm font-medium">Reason</span>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="border border-black rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-400 text-black"
                  required
                >
                  <option value="fraud">Suspected fraud / scam</option>
                  <option value="counterfeit">Counterfeit item</option>
                  <option value="abuse">Abusive behavior</option>
                  <option value="other">Other</option>
                </select>
              </label>

              <label className="grid gap-1">
                <span className="text-sm font-medium">Details</span>
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  rows={4}
                  placeholder="Describe what happened"
                  className="border border-black rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-400 text-black placeholder-gray-500"
                  required
                />
              </label>

              <div className="mt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-3 py-2 rounded-md border border-black text-sm text-black bg-white hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-3 py-2 rounded-md bg-red-600 text-white text-sm font-medium hover:bg-red-700 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {submitting ? "Submitting..." : "Submit report"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast */}
      <div
        className={`fixed left-1/2 -translate-x-1/2 z-[70] transition-all duration-300 ${
          toastOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
        }`}
        style={{ bottom: "calc(var(--bottom-nav-height, 56px) + env(safe-area-inset-bottom) + 1.5rem)" }}
        role="status"
        aria-live="polite"
      >
        <div className={`rounded-full px-4 py-2 shadow-lg border ${
          toastType === "error" 
            ? "bg-red-600 text-white border-red-400"
            : "bg-black text-white border-white/10"
        }`}>
          {toastMsg || "Action completed."}
        </div>
      </div>
    </>
  );
}
