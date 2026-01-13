"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase";

type Report = {
  id: string;
  reason: string;
  status: string;
  created_at: string;
};

export const dynamic = "force-dynamic";

export default function ModerationLogPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReports();
  }, []);

  async function loadReports() {
    setLoading(true);
    setError(null);
    try {
      const supabase = supabaseBrowser();
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        setError("Please sign in as an admin to view moderation history.");
        setLoading(false);
        return;
      }
      const res = await fetch("/api/reports", {
        headers: { Authorization: `Bearer ${session.session.access_token}` },
      });
      if (!res.ok) {
        throw new Error("Failed to load reports");
      }
      const data = await res.json();
      setReports(Array.isArray(data.reports) ? data.reports : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load moderation log");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="mb-4">
        <Link href="/admin/dashboard" className="text-sm font-medium text-blue-600 hover:text-blue-800 mb-2 inline-block">
          ← Back to Dashboard
        </Link>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Moderation Log</h1>
          <p className="text-gray-600">Track outstanding reports and recent enforcement actions.</p>
        </div>
        <Link href="/admin/reports" className="text-sm font-medium text-blue-600 hover:text-blue-800">
          Go to report queue →
        </Link>
      </div>

      {loading && <div className="text-sm text-gray-600">Loading moderation activity…</div>}
      {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {!loading && !error && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm divide-y divide-gray-100">
          {reports.length === 0 ? (
            <div className="p-6 text-sm text-gray-600">No reports yet. Great job keeping things tidy.</div>
          ) : (
            reports.map((report) => (
              <article key={report.id} className="p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{report.reason}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(report.created_at).toLocaleString()} • {report.status}
                  </p>
                </div>
                <Link
                  href={`/admin/reports?focus=${report.id}`}
                  className="text-sm font-medium text-yellow-700 hover:text-yellow-900"
                >
                  Review →
                </Link>
              </article>
            ))
          )}
        </div>
      )}
    </section>
  );
}
