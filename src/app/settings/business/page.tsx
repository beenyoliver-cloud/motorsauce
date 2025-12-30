"use client";

import { Suspense } from "react";
import { useState, useEffect, useRef } from "react";
import type { ComponentType } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { supabaseBrowser } from "@/lib/supabase";
import { uploadComplianceDocument } from "@/lib/storage";
import { logTelemetry } from "@/lib/telemetry";
import { Upload, Loader2, ShieldCheck, AlertTriangle, Clock3, FileCheck2 } from "lucide-react";

type SellerVerificationStatus = "approved" | "pending" | "rejected" | "unverified";

type VerificationRequest = {
  id: string;
  status: SellerVerificationStatus | string;
  document_type?: string | null;
  review_notes?: string | null;
  created_at: string;
  document_url?: string | null;
};

const MAX_VERIFICATION_FILE = 15 * 1024 * 1024; // 15MB

const VERIFICATION_DOC_OPTIONS = [
  { value: "id", label: "Government-issued ID" },
  { value: "business", label: "Business registration / VAT" },
  { value: "address", label: "Proof of trading address" },
];

function BusinessSettingsContent() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<SellerVerificationStatus>("unverified");
  const [verificationNote, setVerificationNote] = useState<string | null>(null);
  const [latestVerification, setLatestVerification] = useState<VerificationRequest | null>(null);
  const [verificationLoading, setVerificationLoading] = useState(true);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [verificationFile, setVerificationFile] = useState<File | null>(null);
  const [verificationDocType, setVerificationDocType] = useState<"id" | "business" | "address">("id");
  const [verificationMessage, setVerificationMessage] = useState("");
  const [verificationSuccess, setVerificationSuccess] = useState<string | null>(null);
  const [submittingVerification, setSubmittingVerification] = useState(false);
  
  const verificationInputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    loadVerificationInfo();
  }, []);

  async function loadVerificationInfo() {
    try {
      setVerificationLoading(true);
      const user = await getCurrentUser();
      if (!user) {
        router.push("/auth/login?next=/settings/business");
        return;
      }

      const supabase = supabaseBrowser();
      setCurrentUserId(user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("account_type, business_verified, verification_status, verification_notes")
        .eq("id", user.id)
        .single();

      if (!profile) {
        setVerificationLoading(false);
        setVerificationError("Unable to load profile");
        setLoading(false);
        return;
      }

      const profileAccountType = typeof profile.account_type === "string"
        ? profile.account_type.toLowerCase().trim()
        : null;

      const { data: authData } = await supabase.auth.getUser();
      const metaAccountType = typeof authData?.user?.user_metadata?.account_type === "string"
        ? authData.user.user_metadata.account_type.toLowerCase().trim()
        : null;

      const effectiveAccountType = profileAccountType || metaAccountType;

      if (effectiveAccountType !== "business") {
        router.push("/settings");
        return;
      }

      const profileStatus: SellerVerificationStatus =
        profile.business_verified
          ? "approved"
          : (profile.verification_status as SellerVerificationStatus) || "unverified";
      setVerificationStatus(profileStatus);
      setVerificationNote(profile.verification_notes ?? null);

      const { data: verificationRows } = await supabase
        .from("seller_verifications")
        .select("id,status,document_type,review_notes,created_at,document_url")
        .eq("profile_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (verificationRows && verificationRows.length > 0) {
        setLatestVerification(verificationRows[0] as VerificationRequest);
        if (!profile?.business_verified && verificationRows[0].status) {
          setVerificationStatus(verificationRows[0].status as SellerVerificationStatus);
        }
      } else {
        setLatestVerification(null);
      }
      setVerificationError(null);
    } catch (err) {
      console.error("Error loading verification info:", err);
      setError("Failed to load verification information");
      setVerificationError("Unable to load verification info");
    } finally {
      setLoading(false);
      setVerificationLoading(false);
    }
  }

  async function refreshVerificationStatus() {
    if (!currentUserId) return;
    try {
      setVerificationLoading(true);
      const supabase = supabaseBrowser();
      const { data: profile } = await supabase
        .from("profiles")
        .select("business_verified, verification_status, verification_notes")
        .eq("id", currentUserId)
        .single();
      const profileStatus: SellerVerificationStatus =
        profile?.business_verified
          ? "approved"
          : (profile?.verification_status as SellerVerificationStatus) || "unverified";
      setVerificationStatus(profileStatus);
      setVerificationNote(profile?.verification_notes ?? null);

      const { data: verificationRows } = await supabase
        .from("seller_verifications")
        .select("id,status,document_type,review_notes,created_at,document_url")
        .eq("profile_id", currentUserId)
        .order("created_at", { ascending: false})
        .limit(1);

      if (verificationRows && verificationRows.length > 0) {
        setLatestVerification(verificationRows[0] as VerificationRequest);
        if (!profile?.business_verified && verificationRows[0].status) {
          setVerificationStatus(verificationRows[0].status as SellerVerificationStatus);
        }
      } else {
        setLatestVerification(null);
      }
      setVerificationError(null);
    } catch (err) {
      console.error("Failed to refresh verification status", err);
      setVerificationError("Unable to refresh verification status");
    } finally {
      setVerificationLoading(false);
    }
  }

  function handleVerificationFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setVerificationError(null);
    if (!file) {
      setVerificationFile(null);
      return;
    }
    if (file.size > MAX_VERIFICATION_FILE) {
      setVerificationError("Document too large. Max 15MB.");
      return;
    }
    setVerificationFile(file);
  }

  async function submitVerificationRequest() {
    if (!currentUserId) {
      setVerificationError("You need to be signed in.");
      return;
    }
    if (!verificationFile) {
      setVerificationError("Upload a document to continue.");
      return;
    }
    setVerificationError(null);
    setVerificationSuccess(null);
    setSubmittingVerification(true);
    try {
      const documentPath = await uploadComplianceDocument(verificationFile);
      const supabase = supabaseBrowser();
      const { error } = await supabase
        .from("seller_verifications")
        .insert({
          profile_id: currentUserId,
          status: "pending",
          document_url: documentPath,
          document_type: verificationDocType,
          notes: verificationMessage || null,
        });
      if (error) throw error;
      setVerificationFile(null);
      if (verificationInputRef.current) {
        verificationInputRef.current.value = "";
      }
      setVerificationMessage("");
      setVerificationStatus("pending");
      setVerificationSuccess("Documents submitted. We'll review them shortly.");
      await refreshVerificationStatus();
      logTelemetry("compliance_upload_submitted", {
        profileId: currentUserId,
        documentType: verificationDocType,
      });
    } catch (err) {
      console.error("Verification submission failed", err);
      setVerificationError(err instanceof Error ? err.message : "Failed to submit documents.");
      logTelemetry("compliance_upload_failed", {
        profileId: currentUserId,
        documentType: verificationDocType,
        error: err instanceof Error ? err.message : "unknown_error",
      });
    } finally {
      setSubmittingVerification(false);
    }
  }

  const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500";

  const verificationStatusMeta: Record<SellerVerificationStatus, { label: string; className: string; icon: ComponentType<{ className?: string }>; helper: string }> = {
    approved: {
      label: "Verified seller",
      className: "bg-green-50 text-green-700 border border-green-200",
      icon: ShieldCheck,
      helper: "Your listings go live instantly.",
    },
    pending: {
      label: "Under review",
      className: "bg-yellow-50 text-yellow-800 border border-yellow-200",
      icon: Clock3,
      helper: "Our trust team is reviewing your documents.",
    },
    rejected: {
      label: "Needs attention",
      className: "bg-red-50 text-red-700 border border-red-200",
      icon: AlertTriangle,
      helper: "Update your documents to continue.",
    },
    unverified: {
      label: "Verification required",
      className: "bg-gray-100 text-gray-700 border border-gray-200",
      icon: FileCheck2,
      helper: "Submit compliance documents to unlock selling.",
    },
  };
  const currentStatusMeta = verificationStatusMeta[verificationStatus];
  const CurrentStatusIcon = currentStatusMeta?.icon;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 w-8 animate-spin text-yellow-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        <div className="mb-6">
          <Link href="/settings" className="text-sm text-gray-600 hover:text-gray-900 inline-block mb-4">
            ← Back to Account Settings
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <ShieldCheck className="w-8 h-8" />
            Seller Verification
          </h1>
          <p className="text-gray-600 mt-2">Submit documents to verify your identity and start selling on MotorSauce</p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Seller verification</h2>
              <p className="text-sm text-gray-600">
                Upload compliance documents so the trust team can approve your storefront.
              </p>
            </div>
            {currentStatusMeta && (
              <div className="text-right">
                <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${currentStatusMeta.className}`}>
                  {CurrentStatusIcon && <CurrentStatusIcon className="h-4 w-4" />}
                  {currentStatusMeta.label}
                </span>
                <p className="mt-1 text-xs text-gray-500">{currentStatusMeta.helper}</p>
              </div>
            )}
          </div>

          {verificationLoading && (
            <p className="mt-4 text-sm text-gray-500">Checking your verification status…</p>
          )}

          {!verificationLoading && (
            <>
              {verificationNote && (
                <div className="mt-4 rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-900">
                  {verificationNote}
                </div>
              )}
              {verificationError && (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  {verificationError}
                </div>
              )}
              {verificationSuccess && (
                <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                  {verificationSuccess}
                </div>
              )}
              {latestVerification && (
                <div className="mt-4 text-sm text-gray-600">
                  <p>
                    Last submission:{" "}
                    <strong>{new Date(latestVerification.created_at).toLocaleString()}</strong>
                  </p>
                  {latestVerification.document_type && (
                    <p className="mt-1">
                      Document type:{" "}
                      <span className="capitalize">{latestVerification.document_type.replace(/_/g, " ")}</span>
                    </p>
                  )}
                  {latestVerification.review_notes && (
                    <p className="mt-1 text-red-700">
                      Review note: {latestVerification.review_notes}
                    </p>
                  )}
                </div>
              )}
            </>
          )}

          {verificationStatus === "approved" ? (
            <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-900">
              You&apos;re fully verified. Future listings will go live as soon as they pass the standard listing checks.
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Document type
                </label>
                <select
                  value={verificationDocType}
                  onChange={(e) => setVerificationDocType(e.target.value as "id" | "business" | "address")}
                  className={inputClass}
                >
                  {VERIFICATION_DOC_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Upload document
                </label>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => verificationInputRef.current?.click()}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-800 hover:border-yellow-400 hover:text-yellow-700"
                  >
                    <Upload size={16} />
                    Select file
                  </button>
                  <input
                    ref={verificationInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    className="hidden"
                    onChange={handleVerificationFileChange}
                  />
                  {verificationFile && (
                    <span className="text-sm text-gray-600 truncate max-w-xs">
                      {verificationFile.name}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Accepts PDF or JPG/PNG files. Max 15MB. Make sure details are clear and legible.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes for reviewers (optional)
                </label>
                <textarea
                  value={verificationMessage}
                  onChange={(e) => setVerificationMessage(e.target.value)}
                  rows={3}
                  className={inputClass}
                  placeholder="List any additional context, trading names, or links that help us verify you."
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={submitVerificationRequest}
                  disabled={submittingVerification || !verificationFile}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-yellow-500 px-4 py-2 text-sm font-semibold text-black hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submittingVerification ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Submitting…
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-4 w-4" />
                      Submit for review
                    </>
                  )}
                </button>
                <p className="text-xs text-gray-500">
                  Typical review time: under 1 business day.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-yellow-500" />
    </div>
  );
}

export default function BusinessSettingsPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <BusinessSettingsContent />
    </Suspense>
  );
}
