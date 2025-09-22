// src/components/ReportListingButton.tsx
"use client";

import { useState } from "react";
import { addReport, hideListingForUser } from "@/lib/moderationStore";

export default function ReportListingButton({ listingId }: { listingId: string | number }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");

  function submit() {
    const r = reason.trim();
    if (!r) return;
    addReport({ id: String(listingId), kind: "listing", reason: r, ts: Date.now() });
    hideListingForUser(String(listingId));
    setOpen(false);
    alert("Thanks. We’ve received your report.");
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-md border border-gray-300 bg-white px-3 py-2 text-xs text-gray-800 hover:bg-gray-50"
      >
        Report listing
      </button>

      {open && (
        <div className="fixed inset-0 z-[70]">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute left-1/2 top-1/2 w-[92vw] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-4 shadow-2xl">
            <h3 className="text-sm font-semibold text-black">Report this listing</h3>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Tell us what’s wrong…"
              className="mt-3 h-28 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
            <div className="mt-3 flex items-center justify-end gap-2">
              <button onClick={() => setOpen(false)} className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-50">Cancel</button>
              <button onClick={submit} className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700">Submit</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
