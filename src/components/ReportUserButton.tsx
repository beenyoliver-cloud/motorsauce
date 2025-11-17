"use client";

import { useEffect, useState } from "react";
import { Flag, X } from "lucide-react";

export default function ReportUserButton({ sellerName }: { sellerName: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("fraud");
  const [details, setDetails] = useState("");

  const [toastOpen, setToastOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  useEffect(() => {
    if (!toastOpen) return;
    const t = setTimeout(() => setToastOpen(false), 3000);
    return () => clearTimeout(t);
  }, [toastOpen]);

  function submitReport(e: React.FormEvent) {
    e.preventDefault();
    // TODO: POST to /api/report in future
    setOpen(false);
    setReason("fraud");
    setDetails("");
    setToastMsg(`Thanks — your report for ${sellerName} was submitted.`);
    setToastOpen(true);
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
                  className="px-3 py-2 rounded-md bg-red-600 text-white text-sm font-medium hover:bg-red-700 shadow-sm"
                >
                  Submit report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast */}
      <div
        className={`fixed left-1/2 -translate-x-1/2 bottom-6 z-[70] transition-all duration-300 ${
          toastOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
        }`}
        role="status"
        aria-live="polite"
      >
        <div className="rounded-full bg-black text-white px-4 py-2 shadow-lg border border-white/10">
          {toastMsg || "Action completed."}
        </div>
      </div>
    </>
  );
}
