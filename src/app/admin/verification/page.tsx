"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase";
import {
  ShieldCheck,
  ShieldAlert,
  Loader2,
  ExternalLink,
  RefreshCcw,
  FileText,
  CheckCircle,
  XCircle,
} from "lucide-react";

type VerificationRecord = {
  id: string;
  profile_id: string;
  status: "pending" | "approved" | "rejected" | string;
  document_type?: string | null;
  document_url?: string | null;
  document_signed_url?: string | null;
  notes?: string | null;
  review_notes?: string | null;
  created_at: string;
  history?: Array<{
    id: string;
    status: string;
    review_notes?: string | null;
    created_at: string;
  }> | null;
  profile?: {
    id: string;
    name: string;
    email: string;
    account_type?: string;
    verification_notes?: string | null;
  } | null;
  business?: {
    profile_id: string;
    business_name?: string | null;
    business_type?: string | null;
    phone_number?: string | null;
    website_url?: string | null;
  } | null;
};

const statusFilters = [
  { id: "pending", label: "Pending" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
  { id: "all", label: "All" },
] as const;

export default function AdminVerificationPage() {
  const router = useRouter();
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [loading, setLoading] = useState(true);
  const [verifications, setVerifications] = useState<VerificationRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<(typeof statusFilters)[number]["id"]>("pending");
  const [noteInputs, setNoteInputs] = useState<Record<string, string>>({});
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkNote, setBulkNote] = useState("");

  useEffect(() => {
    async function init() {
      try {
        const supabase = supabaseBrowser();
        const [{ data: { user } }, { data: { session } }] = await Promise.all([
          supabase.auth.getUser(),
          supabase.auth.getSession(),
        ]);

        if (!user || !session?.access_token) {
          router.push("/auth/login?next=/admin/verification");
          return;
        }

        const token = session.access_token;
        const adminRes = await fetch("/api/is-admin", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!adminRes.ok) {
          router.push("/");
          return;
        }

        const { isAdmin } = await adminRes.json();
        if (!isAdmin) {
          router.push("/");
          return;
        }

        setAuthToken(token);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to verify admin access");
      } finally {
        setInitializing(false);
      }
    }

    init();
  }, [router]);

  useEffect(() => {
    if (!authToken) return;
    fetchVerifications(filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken, filter]);

  async function fetchVerifications(status: string) {
    setLoading(true);
    setError(null);
    try {
      const url = `/api/admin/verification${status ? `?status=${status}` : ""}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${authToken}` } });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(body || "Failed to load verifications");
      }
      const data = await res.json();
      setVerifications(data);
      setSelectedIds([]);
    } catch (err) {
      console.error("fetchVerifications error", err);
      setError(err instanceof Error ? err.message : "Failed to load verifications");
    } finally {
      setLoading(false);
    }
  }

  function toggleSelection(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((entry) => entry !== id) : [...prev, id]
    );
  }

  async function handleBulkAction(action: "approve" | "reject") {
    if (!authToken || selectedIds.length === 0) return;
    setActionLoading(`bulk-${action}`);
    setError(null);
    try {
      const res = await fetch("/api/admin/verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          verificationIds: selectedIds,
          action,
          notes: bulkNote,
        }),
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(body || "Failed to update verification");
      }
      setBulkNote("");
      setSelectedIds([]);
      await fetchVerifications(filter);
    } catch (err) {
      console.error("bulkAction error", err);
      setError(err instanceof Error ? err.message : "Unable to update verification");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleAction(id: string, action: "approve" | "reject") {
    if (!authToken) return;
    setActionLoading(id + action);
    setError(null);
    try {
      const res = await fetch("/api/admin/verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          verificationId: id,
          action,
          notes: noteInputs[id] || "",
        }),
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(body || "Failed to update verification");
      }
      setNoteInputs((prev) => ({ ...prev, [id]: "" }));
      await fetchVerifications(filter);
    } catch (err) {
      console.error("handleAction error", err);
      setError(err instanceof Error ? err.message : "Unable to update verification");
    } finally {
      setActionLoading(null);
    }
  }

  const pendingCount = useMemo(
    () => verifications.filter((v) => v.status === "pending").length,
    [verifications]
  );

  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-yellow-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Seller Verification Queue</h1>
            <p className="text-gray-600 mt-1">
              Review compliance documents to approve legitimate sellers and block risky accounts.
            </p>
          </div>
          <Link href="/admin/dashboard" className="text-sm text-gray-600 hover:text-gray-900">
            ← Back to Admin
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-6">
          {statusFilters.map((s) => (
            <button
              key={s.id}
              onClick={() => setFilter(s.id)}
              className={`px-4 py-1.5 rounded-full border text-sm font-semibold transition ${
                filter === s.id
                  ? "bg-yellow-500 text-black border-yellow-500"
                  : "bg-white text-gray-700 border-gray-200 hover:border-yellow-300"
              }`}
            >
              {s.label}
              {s.id === "pending" && pendingCount > 0 && (
                <span className="ml-2 inline-flex items-center justify-center rounded-full bg-black/80 text-white text-xs px-2 py-0.5">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
          <button
            onClick={() => fetchVerifications(filter)}
            className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-1.5 text-sm text-gray-700 hover:border-yellow-300"
          >
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        )}

        {selectedIds.length > 0 && (
          <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-700">
                {selectedIds.length} request{selectedIds.length > 1 ? "s" : ""} selected
              </p>
              <button
                className="text-xs text-gray-500 hover:text-gray-800"
                onClick={() => setSelectedIds([])}
              >
                Clear selection
              </button>
            </div>
            <textarea
              rows={2}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-yellow-500 focus:outline-none focus:ring-1 focus:ring-yellow-500"
              placeholder="Optional note applied to each decision"
              value={bulkNote}
              onChange={(e) => setBulkNote(e.target.value)}
            />
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => handleBulkAction("approve")}
                disabled={actionLoading !== null}
                className="inline-flex items-center gap-2 rounded-full bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
              >
                Approve selected
              </button>
              <button
                onClick={() => handleBulkAction("reject")}
                disabled={actionLoading !== null}
                className="inline-flex items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                Reject selected
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-yellow-500" />
          </div>
        ) : verifications.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-10 text-center text-gray-600">
            No verification requests in this bucket.
          </div>
        ) : (
          <div className="space-y-5">
            {verifications.map((request) => (
              <article
                key={request.id}
                className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"
                      checked={selectedIds.includes(request.id)}
                      onChange={() => toggleSelection(request.id)}
                    />
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-gray-500">
                        Submitted {new Date(request.created_at).toLocaleString()}
                      </p>
                          <h2 className="mt-2 text-xl font-semibold text-gray-900">
                            {request.business?.business_name || request.profile?.name || "Unknown Seller"}
                          </h2>
                          <p className="text-sm text-gray-600">
                            {request.profile?.email} ·{" "}
                            {request.business?.business_type || request.document_type || "No type"}
                          </p>
                          {request.profile?.verification_notes && (
                            <p className="mt-2 text-sm text-yellow-700">
                              Seller note: {request.profile.verification_notes}
                            </p>
                          )}
                          {request.notes && (
                            <p className="mt-1 text-sm text-gray-600">
                              Submission note: {request.notes}
                            </p>
                          )}
                        </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    <p>Status:</p>
                    <p className="font-semibold text-gray-900 capitalize">{request.status}</p>
                    {request.document_signed_url && (
                      <a
                        href={request.document_signed_url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-flex items-center gap-1 text-sm text-yellow-600 hover:text-yellow-500"
                      >
                        <FileText className="h-4 w-4" />
                        View document
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>

                {request.history && request.history.length > 1 && (
                  <details className="mt-4 rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm text-gray-700">
                    <summary className="cursor-pointer font-semibold text-gray-900">
                      Comment history ({request.history.length - 1})
                    </summary>
                    <ul className="mt-2 space-y-2">
                      {request.history
                        .filter((entry) => entry.id !== request.id)
                        .map((entry) => (
                          <li key={entry.id} className="rounded border border-gray-200 bg-white p-2">
                            <p className="text-xs text-gray-500">
                              {new Date(entry.created_at).toLocaleString()} · {entry.status}
                            </p>
                            {entry.review_notes && (
                              <p className="text-sm text-gray-700">{entry.review_notes}</p>
                            )}
                          </li>
                        ))}
                    </ul>
                  </details>
                )}

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes to seller
                  </label>
                  <textarea
                    rows={3}
                    value={noteInputs[request.id] ?? ""}
                    onChange={(e) => setNoteInputs((prev) => ({ ...prev, [request.id]: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-yellow-500 focus:outline-none focus:ring-1 focus:ring-yellow-500"
                    placeholder="Explain approval or what needs to change if rejecting…"
                  />
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => handleAction(request.id, "approve")}
                    disabled={actionLoading !== null}
                    className="inline-flex items-center gap-2 rounded-full bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
                  >
                    {actionLoading === request.id + "approve" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4" />
                    )}
                    Approve
                  </button>
                  <button
                    onClick={() => handleAction(request.id, "reject")}
                    disabled={actionLoading !== null}
                    className="inline-flex items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                  >
                    {actionLoading === request.id + "reject" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                    Reject
                  </button>
                  <p className="text-xs text-gray-500">
                    Approvals mark the seller as verified immediately.
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
