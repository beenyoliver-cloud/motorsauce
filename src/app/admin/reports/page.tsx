// src/app/admin/reports/page.tsx
"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase";
import { Flag, Eye, CheckCircle, XCircle, AlertCircle, Clock, Users, ArrowLeft } from "lucide-react";

interface Report {
  report_id: string;
  reporter_id: string;
  reporter_name: string;
  reporter_email: string;
  reported_user_id: string;
  reported_user_name: string;
  reported_user_email: string;
  reason: string;
  details: string;
  status: string;
  admin_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

function AdminReportsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userIdFilter = searchParams.get("user");
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [reports, setReports] = useState<Report[]>([]);
  const [filter, setFilter] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [updating, setUpdating] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkAdminAndLoadReports();
  }, [filter, userIdFilter]);

  async function checkAdminAndLoadReports() {
    try {
      setLoading(true);
      const supabase = supabaseBrowser();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push("/auth/login?next=/admin/reports");
        return;
      }

      // Check if user is admin
      const { data: admin } = await supabase
        .from("admins")
        .select("*")
        .eq("user_id", session.user.id)
        .single();

      if (!admin) {
        setError("Access denied. Admin privileges required.");
        setLoading(false);
        return;
      }

      setIsAdmin(true);

      // Load reports
      const params = new URLSearchParams();
      if (filter) params.append("status", filter);
      if (userIdFilter) params.append("userId", userIdFilter);

      const res = await fetch(`/api/reports?${params}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!res.ok) {
        throw new Error("Failed to load reports");
      }

      const data = await res.json();
      setReports(data.reports || []);
    } catch (err) {
      console.error("Failed to load reports:", err);
      setError(err instanceof Error ? err.message : "Failed to load reports");
    } finally {
      setLoading(false);
    }
  }

  async function updateReport(reportId: string, status: string, notes: string) {
    setUpdating(true);
    try {
      const supabase = supabaseBrowser();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) return;

      const res = await fetch(`/api/reports?id=${reportId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          status,
          admin_notes: notes,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to update report");
      }

      setSelectedReport(null);
      setNewStatus("");
      setAdminNotes("");
      checkAdminAndLoadReports();
    } catch (err) {
      console.error("Failed to update report:", err);
      alert(err instanceof Error ? err.message : "Failed to update report");
    } finally {
      setUpdating(false);
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending": return <Clock className="h-4 w-4" />;
      case "investigating": return <AlertCircle className="h-4 w-4" />;
      case "resolved": return <CheckCircle className="h-4 w-4" />;
      case "dismissed": return <XCircle className="h-4 w-4" />;
      default: return <Flag className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "investigating": return "bg-blue-100 text-blue-800 border-blue-200";
      case "resolved": return "bg-green-100 text-green-800 border-green-200";
      case "dismissed": return "bg-gray-100 text-gray-800 border-gray-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getReasonLabel = (reason: string) => {
    switch (reason) {
      case "fraud": return "Suspected Fraud";
      case "counterfeit": return "Counterfeit Item";
      case "abuse": return "Abusive Behavior";
      case "spam": return "Spam";
      case "other": return "Other";
      default: return reason;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Access Denied</h1>
          <p className="text-gray-600">{error || "Admin privileges required"}</p>
        </div>
      </div>
    );
  }

  const pendingCount = reports.filter(r => r.status === "pending").length;
  const investigatingCount = reports.filter(r => r.status === "investigating").length;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Navigation */}
        <div className="mb-4 flex gap-2">
          <button
            onClick={() => router.push("/admin/users")}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
          >
            <Users size={16} />
            User Management
          </button>
          {userIdFilter && (
            <button
              onClick={() => router.push("/admin/reports")}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
            >
              <ArrowLeft size={16} />
              Clear Filter
            </button>
          )}
        </div>

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Flag className="h-8 w-8 text-red-600" />
            User Reports
            {userIdFilter && (
              <span className="text-base font-normal text-gray-600">
                (Filtered by user)
              </span>
            )}
          </h1>
          <p className="text-gray-600 mt-2">
            Review and manage user reports • {pendingCount} pending • {investigatingCount} investigating
          </p>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setFilter(null)}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filter === null
                ? "bg-yellow-500 text-black"
                : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
            }`}
          >
            All ({reports.length})
          </button>
          <button
            onClick={() => setFilter("pending")}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filter === "pending"
                ? "bg-yellow-500 text-black"
                : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
            }`}
          >
            Pending ({pendingCount})
          </button>
          <button
            onClick={() => setFilter("investigating")}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filter === "investigating"
                ? "bg-yellow-500 text-black"
                : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
            }`}
          >
            Investigating ({investigatingCount})
          </button>
          <button
            onClick={() => setFilter("resolved")}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filter === "resolved"
                ? "bg-yellow-500 text-black"
                : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
            }`}
          >
            Resolved
          </button>
          <button
            onClick={() => setFilter("dismissed")}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filter === "dismissed"
                ? "bg-yellow-500 text-black"
                : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
            }`}
          >
            Dismissed
          </button>
        </div>

        {/* Reports List */}
        {reports.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <Flag className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">
              {filter ? `No ${filter} reports` : "No reports yet"}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map((report) => (
              <div
                key={report.report_id}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium border ${getStatusColor(report.status)}`}>
                        {getStatusIcon(report.status)}
                        {report.status}
                      </span>
                      <span className="text-sm font-semibold text-red-600">
                        {getReasonLabel(report.reason)}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(report.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="text-sm">
                        <span className="text-gray-600">Reported user:</span>{" "}
                        <span className="font-semibold text-gray-900">
                          {report.reported_user_name}
                        </span>
                        <span className="text-gray-500 ml-2">
                          ({report.reported_user_email})
                        </span>
                      </div>
                      
                      <div className="text-sm">
                        <span className="text-gray-600">Reported by:</span>{" "}
                        <span className="text-gray-900">{report.reporter_name}</span>
                        <span className="text-gray-500 ml-2">
                          ({report.reporter_email})
                        </span>
                      </div>

                      <div className="text-sm bg-gray-50 border border-gray-200 rounded p-3 mt-2">
                        <span className="font-medium text-gray-700">Details:</span>
                        <p className="text-gray-900 mt-1">{report.details}</p>
                      </div>

                      {report.admin_notes && (
                        <div className="text-sm bg-blue-50 border border-blue-200 rounded p-3 mt-2">
                          <span className="font-medium text-blue-700">Admin Notes:</span>
                          <p className="text-blue-900 mt-1">{report.admin_notes}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedReport(report);
                      setNewStatus(report.status);
                      setAdminNotes(report.admin_notes || "");
                    }}
                    className="px-4 py-2 bg-yellow-500 text-black font-medium rounded-lg hover:bg-yellow-600 transition inline-flex items-center gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    Review
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Review Modal */}
        {selectedReport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={() => setSelectedReport(null)} />
            <div className="relative z-51 w-full max-w-2xl bg-white rounded-lg shadow-xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 space-y-4">
                <h2 className="text-2xl font-bold text-gray-900">Review Report</h2>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    >
                      <option value="pending">Pending</option>
                      <option value="investigating">Investigating</option>
                      <option value="resolved">Resolved</option>
                      <option value="dismissed">Dismissed</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Admin Notes
                    </label>
                    <textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400"
                      placeholder="Add internal notes about this report..."
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setSelectedReport(null)}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => updateReport(selectedReport.report_id, newStatus, adminNotes)}
                    disabled={updating}
                    className="flex-1 px-4 py-2 bg-yellow-500 text-black font-medium rounded-lg hover:bg-yellow-600 transition disabled:opacity-60"
                  >
                    {updating ? "Updating..." : "Update Report"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Wrap in Suspense to handle useSearchParams
export default function AdminReportsPageWrapper() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    }>
      <AdminReportsPage />
    </Suspense>
  );
}
