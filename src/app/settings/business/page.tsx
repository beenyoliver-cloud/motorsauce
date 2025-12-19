"use client";

import { useState, useEffect, useRef } from "react";
import type { ComponentType } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { supabaseBrowser } from "@/lib/supabase";
import { uploadComplianceDocument } from "@/lib/storage";
import { Building2, Upload, Loader2, Image as ImageIcon, X, Check, ShieldCheck, AlertTriangle, Clock3, FileCheck2 } from "lucide-react";
import Cropper from "react-easy-crop";

type BusinessInfo = {
  business_name: string;
  business_type: string;
  logo_url: string | null;
  banner_url: string | null;
  phone_number: string | null;
  website_url: string | null;
  customer_support_email: string | null;
  about_business: string | null;
  specialties: string[];
  years_established: number | null;
  opening_hours: any;
  business_address: {
    street: string;
    city: string;
    postcode: string;
    country: string;
  } | null;
  brand_primary_color: string;
  brand_secondary_color: string;
  brand_accent_color: string;
};

type SellerVerificationStatus = "approved" | "pending" | "rejected" | "unverified";

type VerificationRequest = {
  id: string;
  status: SellerVerificationStatus | string;
  document_type?: string | null;
  review_notes?: string | null;
  created_at: string;
  document_url?: string | null;
};

const BRANDING_DEFAULTS = {
  brand_primary_color: "#facc15",
  brand_secondary_color: "#0f172a",
  brand_accent_color: "#fde68a",
};

const MAX_VERIFICATION_FILE = 15 * 1024 * 1024; // 15MB

const VERIFICATION_DOC_OPTIONS = [
  { value: "id", label: "Government-issued ID" },
  { value: "business", label: "Business registration / VAT" },
  { value: "address", label: "Proof of trading address" },
];

const BRAND_COLOR_FIELDS: { key: "brand_primary_color" | "brand_secondary_color" | "brand_accent_color"; label: string; helper: string }[] = [
  { key: "brand_primary_color", label: "Primary", helper: "Buttons & highlights" },
  { key: "brand_secondary_color", label: "Secondary", helper: "Header gradients" },
  { key: "brand_accent_color", label: "Accent", helper: "Badges & chips" },
];

export default function BusinessSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [uploading, setUploading] = useState<'logo' | 'banner' | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [initialBusinessInfo, setInitialBusinessInfo] = useState<BusinessInfo | null>(null);
  const [showInActivityFeed, setShowInActivityFeed] = useState(true);
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
  
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const verificationInputRef = useRef<HTMLInputElement>(null);
  
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo>({
    business_name: "",
    business_type: "",
    logo_url: null,
    banner_url: null,
    phone_number: null,
    website_url: null,
    customer_support_email: null,
    about_business: null,
    specialties: [],
    years_established: null,
    opening_hours: {
      monday: { open: "09:00", close: "17:00", closed: false },
      tuesday: { open: "09:00", close: "17:00", closed: false },
      wednesday: { open: "09:00", close: "17:00", closed: false },
      thursday: { open: "09:00", close: "17:00", closed: false },
      friday: { open: "09:00", close: "17:00", closed: false },
      saturday: { open: "09:00", close: "13:00", closed: false },
      sunday: { open: "", close: "", closed: true },
    },
    business_address: null,
    ...BRANDING_DEFAULTS,
  });

  const [specialtyInput, setSpecialtyInput] = useState("");
  // Cropping state
  const [cropOpen, setCropOpen] = useState<null | 'logo' | 'banner'>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  function onCropComplete(_: any, areaPixels: any) {
    setCroppedAreaPixels(areaPixels);
  }

  async function createCroppedBlob(imageSrc: string, areaPixels: any, outW: number, outH: number, mime = 'image/webp', quality = 0.9): Promise<Blob> {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageSrc;
    await new Promise((res, rej) => { img.onload = () => res(null); img.onerror = rej; });

    const canvas = document.createElement('canvas');
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas not supported');
    // Draw from source crop to output size
    ctx.drawImage(
      img,
      areaPixels.x,
      areaPixels.y,
      areaPixels.width,
      areaPixels.height,
      0,
      0,
      outW,
      outH
    );
    return await new Promise((resolve) => canvas.toBlob((b) => resolve(b as Blob), mime, quality));
  }

  useEffect(() => {
    loadBusinessInfo();
  }, []);

  // Warn user about unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  async function loadBusinessInfo() {
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
        .select("account_type, show_in_activity_feed, business_verified, verification_status, verification_notes")
        .eq("id", user.id)
        .single();

      if (profile?.account_type !== "business") {
        router.push("/settings");
        return;
      }

      // Load activity feed preference from profile
      setShowInActivityFeed(profile.show_in_activity_feed !== false);
      const profileStatus: SellerVerificationStatus =
        profile?.business_verified
          ? "approved"
          : (profile?.verification_status as SellerVerificationStatus) || "unverified";
      setVerificationStatus(profileStatus);
      setVerificationNote(profile?.verification_notes ?? null);

      const { data, error } = await supabase
        .from("business_info")
        .select("*")
        .eq("profile_id", user.id)
        .single();

      if (data) {
        const loadedInfo = {
          business_name: data.business_name || "",
          business_type: data.business_type || "",
          logo_url: data.logo_url,
          banner_url: data.banner_url,
          phone_number: data.phone_number,
          website_url: data.website_url,
          customer_support_email: data.customer_support_email,
          about_business: data.about_business,
          specialties: data.specialties || [],
          years_established: data.years_established,
          opening_hours: data.opening_hours || businessInfo.opening_hours,
          business_address: data.business_address,
          brand_primary_color: data.brand_primary_color || BRANDING_DEFAULTS.brand_primary_color,
          brand_secondary_color: data.brand_secondary_color || BRANDING_DEFAULTS.brand_secondary_color,
          brand_accent_color: data.brand_accent_color || BRANDING_DEFAULTS.brand_accent_color,
        };
        setBusinessInfo(loadedInfo);
        setInitialBusinessInfo(loadedInfo);
      }

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
      console.error("Error loading business info:", err);
      setError("Failed to load business information");
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
      console.error("Failed to refresh verification status", err);
      setVerificationError("Unable to refresh verification status");
    } finally {
      setVerificationLoading(false);
    }
  }

  async function handleSave() {
    setError(null);
    setSuccess(false);
    setSaving(true);

    try {
      const user = await getCurrentUser();
      if (!user) throw new Error("Not authenticated");

      const supabase = supabaseBrowser();
      
      const { error: updateError } = await supabase
        .from("business_info")
        .upsert({
          profile_id: user.id,
          ...businessInfo,
        });

      if (updateError) throw updateError;

      // Also update the profile's activity feed preference
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ show_in_activity_feed: showInActivityFeed })
        .eq("id", user.id);

      if (profileError) throw profileError;

      setSuccess(true);
      setHasUnsavedChanges(false);
      setInitialBusinessInfo(businessInfo);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error("Error saving:", err);
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleImageUpload(file: File, type: 'logo' | 'banner') {
    setUploading(type);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);

      const response = await fetch('/api/business/upload-image', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      // Update local state
      if (type === 'logo') {
        setBusinessInfo({ ...businessInfo, logo_url: data.url });
      } else {
        setBusinessInfo({ ...businessInfo, banner_url: data.url });
      }

      setHasUnsavedChanges(true);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(null);
    }
  }

  function handleBusinessInfoChange(updates: Partial<BusinessInfo>) {
    setBusinessInfo({ ...businessInfo, ...updates });
    setHasUnsavedChanges(true);
  }

  function handleLogoFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setCropSrc(previewUrl);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCropOpen('logo');
    }
  }

  function handleBannerFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setCropSrc(previewUrl);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCropOpen('banner');
    }
  }

  function addSpecialty() {
    if (specialtyInput.trim() && !businessInfo.specialties.includes(specialtyInput.trim())) {
      handleBusinessInfoChange({
        specialties: [...businessInfo.specialties, specialtyInput.trim()],
      });
      setSpecialtyInput("");
    }
  }

  function removeSpecialty(index: number) {
    handleBusinessInfoChange({
      specialties: businessInfo.specialties.filter((_, i) => i !== index),
    });
  }

  async function confirmCrop() {
    if (!cropOpen || !cropSrc || !croppedAreaPixels) return;
    try {
      if (cropOpen === 'logo') {
        // output 512x512 webp
        const blob = await createCroppedBlob(cropSrc, croppedAreaPixels, 512, 512, 'image/webp', 0.9);
        const file = new File([blob], 'logo.webp', { type: 'image/webp' });
        const localUrl = URL.createObjectURL(blob);
        setBusinessInfo({ ...businessInfo, logo_url: localUrl });
        await handleImageUpload(file, 'logo');
      } else {
        // banner: 1920x400 webp
        const blob = await createCroppedBlob(cropSrc, croppedAreaPixels, 1920, 400, 'image/webp', 0.9);
        const file = new File([blob], 'banner.webp', { type: 'image/webp' });
        const localUrl = URL.createObjectURL(blob);
        setBusinessInfo({ ...businessInfo, banner_url: localUrl });
        await handleImageUpload(file, 'banner');
      }
    } finally {
      setCropOpen(null);
      setCropSrc(null);
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
      const url = await uploadComplianceDocument(verificationFile);
      const supabase = supabaseBrowser();
      const { error } = await supabase
        .from("seller_verifications")
        .insert({
          profile_id: currentUserId,
          status: "pending",
          document_url: url,
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
    } catch (err) {
      console.error("Verification submission failed", err);
      setVerificationError(err instanceof Error ? err.message : "Failed to submit documents.");
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Building2 className="w-8 h-8" />
            Business Settings
          </h1>
          <p className="text-gray-600 mt-2">Manage your business storefront appearance and information</p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
            Settings saved successfully!
          </div>
        )}

        <div className="space-y-6">
          {/* Seller Verification */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Seller verification</h2>
                <p className="text-sm text-gray-600">
                  Upload compliance documents so the trust team can approve your storefront.
                </p>
              </div>
              {verificationStatusMeta[verificationStatus] && (
                <div className="text-right">
                  <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${verificationStatusMeta[verificationStatus].className}`}>
                    <verificationStatusMeta[verificationStatus].icon className="h-4 w-4" />
                    {verificationStatusMeta[verificationStatus].label}
                  </span>
                  <p className="mt-1 text-xs text-gray-500">{verificationStatusMeta[verificationStatus].helper}</p>
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

                {verificationStatus === "approved" ? (
                  <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-900">
                    You're fully verified. Future listings will go live as soon as they pass the standard listing checks.
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
              </>
            )}
          </div>

          {/* Business Identity */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Business Identity</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business Name *
                </label>
                <input
                  type="text"
                  value={businessInfo.business_name}
                  onChange={(e) => handleBusinessInfoChange({ business_name: e.target.value })}
                  className={inputClass}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business Type *
                </label>
                <select
                  value={businessInfo.business_type}
                  onChange={(e) => handleBusinessInfoChange({ business_type: e.target.value })}
                  className={inputClass}
                  required
                >
                  <option value="">Select type...</option>
                  <option value="oem_supplier">OEM Supplier</option>
                  <option value="breaker">Breaker / Salvage Yard</option>
                  <option value="parts_retailer">Parts Retailer</option>
                  <option value="performance_tuner">Performance Tuner</option>
                  <option value="restoration_specialist">Restoration Specialist</option>
                  <option value="racing_team">Racing Team</option>
                  <option value="custom_fabricator">Custom Fabricator</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Year Established
                </label>
                <input
                  type="number"
                  value={businessInfo.years_established || ""}
                  onChange={(e) => handleBusinessInfoChange({ years_established: e.target.value ? parseInt(e.target.value) : null })}
                  className={inputClass}
                  min="1900"
                  max={new Date().getFullYear()}
                />
              </div>
            </div>
          </div>

          {/* Branding */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Branding</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Logo
                </label>
                <div className="flex items-start gap-4">
                  {businessInfo.logo_url && (
                    <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-gray-200 shrink-0 bg-gray-100">
                      <img 
                        src={businessInfo.logo_url} 
                        alt="Logo preview" 
                        className="w-full h-full object-cover object-center" 
                        onError={(e) => e.currentTarget.style.display = 'none'} 
                      />
                    </div>
                  )}
                  <div className="flex-1">
                    <input
                      type="url"
                      value={businessInfo.logo_url || ""}
                      onChange={(e) => handleBusinessInfoChange({ logo_url: e.target.value })}
                      placeholder="https://example.com/logo.jpg"
                      className={inputClass + " mb-2"}
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => logoInputRef.current?.click()}
                        disabled={uploading === 'logo'}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition"
                      >
                        <Upload size={16} />
                        {uploading === 'logo' ? 'Uploading...' : 'Upload Logo'}
                      </button>
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        onChange={handleLogoFileChange}
                        className="hidden"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Upload an image or paste a URL. Square image recommended. Max 5MB (JPEG, PNG, WebP)
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Storefront Banner
                </label>
                <div className="space-y-2">
                  {businessInfo.banner_url && (
                    <img 
                      src={businessInfo.banner_url} 
                      alt="Banner preview" 
                      className="w-full h-32 rounded-lg object-cover border-2 border-gray-200" 
                      onError={(e) => e.currentTarget.style.display = 'none'} 
                    />
                  )}
                  <input
                    type="url"
                    value={businessInfo.banner_url || ""}
                    onChange={(e) => handleBusinessInfoChange({ banner_url: e.target.value })}
                    placeholder="https://example.com/banner.jpg"
                    className={inputClass + " mb-2"}
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => bannerInputRef.current?.click()}
                      disabled={uploading === 'banner'}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      <ImageIcon size={16} />
                      {uploading === 'banner' ? 'Uploading...' : 'Upload Banner'}
                    </button>
                    <input
                      ref={bannerInputRef}
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      onChange={handleBannerFileChange}
                      className="hidden"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Upload an image or paste a URL. Wide banner recommended (1920x400px). Max 5MB (JPEG, PNG, WebP)
                  </p>
                </div>
              </div>

              <div className="border border-dashed border-gray-200 rounded-xl p-4 space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-800">Brand colours</p>
                  <p className="text-xs text-gray-500">
                    Tune the storefront theme. Primary powers buttons, secondary sets the backdrop, accent is used for tags and badges.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {BRAND_COLOR_FIELDS.map((field) => (
                    <div key={field.key} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={businessInfo[field.key] || "#000000"}
                          onChange={(e) =>
                            handleBusinessInfoChange({
                              [field.key]: e.target.value,
                            } as Partial<BusinessInfo>)
                          }
                          className="h-12 w-12 rounded-lg border border-gray-200"
                          aria-label={`${field.label} colour`}
                        />
                        <div className="flex-1">
                          <label className="text-sm font-medium text-gray-700">{field.label}</label>
                          <input
                            type="text"
                            value={businessInfo[field.key] || ""}
                            onChange={(e) =>
                              handleBusinessInfoChange({
                                [field.key]: e.target.value,
                              } as Partial<BusinessInfo>)
                            }
                            className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
                            placeholder="#FACC15"
                          />
                          <p className="text-xs text-gray-500 mt-1">{field.helper}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div
                    className="h-14 rounded-2xl shadow-inner"
                    style={{
                      background: `linear-gradient(120deg, ${businessInfo.brand_primary_color || BRANDING_DEFAULTS.brand_primary_color}, ${
                        businessInfo.brand_secondary_color || BRANDING_DEFAULTS.brand_secondary_color
                      })`,
                    }}
                  />
                  <div
                    className="h-14 rounded-2xl border border-gray-200 shadow-inner"
                    style={{ backgroundColor: businessInfo.brand_secondary_color || BRANDING_DEFAULTS.brand_secondary_color }}
                  />
                  <div
                    className="h-14 rounded-2xl border border-gray-200 shadow-inner"
                    style={{ backgroundColor: businessInfo.brand_accent_color || BRANDING_DEFAULTS.brand_accent_color }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Contact Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={businessInfo.phone_number || ""}
                  onChange={(e) => handleBusinessInfoChange({ phone_number: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Website URL
                </label>
                <input
                  type="url"
                  value={businessInfo.website_url || ""}
                  onChange={(e) => handleBusinessInfoChange({ website_url: e.target.value })}
                  className={inputClass}
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Customer Support Email
                </label>
                <input
                  type="email"
                  value={businessInfo.customer_support_email || ""}
                  onChange={(e) => handleBusinessInfoChange({ customer_support_email: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          {/* About Business */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">About Your Business</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={businessInfo.about_business || ""}
                  onChange={(e) => handleBusinessInfoChange({ about_business: e.target.value })}
                  className={inputClass}
                  rows={6}
                  placeholder="Tell customers about your business..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Specialties
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={specialtyInput}
                    onChange={(e) => setSpecialtyInput(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addSpecialty())}
                    className={inputClass}
                    placeholder="e.g., BMW, Performance Parts"
                  />
                  <button
                    type="button"
                    onClick={addSpecialty}
                    className="px-4 py-2 bg-yellow-500 text-black font-medium rounded-lg hover:bg-yellow-600"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {businessInfo.specialties.map((specialty, idx) => (
                    <span
                      key={idx}
                      className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                    >
                      {specialty}
                      <button
                        onClick={() => removeSpecialty(idx)}
                        className="text-gray-500 hover:text-red-600"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Opening Hours */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Opening Hours</h2>
            <div className="space-y-3">
              {Object.entries(businessInfo.opening_hours).map(([day, hours]: [string, any]) => (
                <div key={day} className="flex items-center gap-4">
                  <div className="w-28 font-medium text-gray-700 capitalize">{day}</div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={!hours.closed}
                      onChange={(e) => handleBusinessInfoChange({
                        opening_hours: {
                          ...businessInfo.opening_hours,
                          [day]: { ...hours, closed: !e.target.checked }
                        }
                      })}
                      className="rounded text-yellow-500"
                    />
                    <span className="text-sm text-gray-600">Open</span>
                  </label>
                  {!hours.closed && (
                    <>
                      <input
                        type="time"
                        value={hours.open}
                        onChange={(e) => handleBusinessInfoChange({
                          opening_hours: {
                            ...businessInfo.opening_hours,
                            [day]: { ...hours, open: e.target.value }
                          }
                        })}
                        className="px-2 py-1 border border-gray-300 rounded"
                      />
                      <span className="text-gray-500">to</span>
                      <input
                        type="time"
                        value={hours.close}
                        onChange={(e) => handleBusinessInfoChange({
                          opening_hours: {
                            ...businessInfo.opening_hours,
                            [day]: { ...hours, close: e.target.value }
                          }
                        })}
                        className="px-2 py-1 border border-gray-300 rounded"
                      />
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Business Address (GDPR-protected) */}
          <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Business Address</h2>
            <p className="text-sm text-blue-800 mb-4">
              This information is private and will never be displayed publicly. It&apos;s stored securely for verification purposes only.
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Street Address
                </label>
                <input
                  type="text"
                  value={businessInfo.business_address?.street || ""}
                  onChange={(e) => handleBusinessInfoChange({
                    business_address: { ...businessInfo.business_address!, street: e.target.value }
                  })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City
                </label>
                <input
                  type="text"
                  value={businessInfo.business_address?.city || ""}
                  onChange={(e) => handleBusinessInfoChange({
                    business_address: { ...businessInfo.business_address!, city: e.target.value }
                  })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Postcode
                </label>
                <input
                  type="text"
                  value={businessInfo.business_address?.postcode || ""}
                  onChange={(e) => handleBusinessInfoChange({
                    business_address: { ...businessInfo.business_address!, postcode: e.target.value }
                  })}
                  className={inputClass}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Country
                </label>
                <input
                  type="text"
                  value={businessInfo.business_address?.country || ""}
                  onChange={(e) => handleBusinessInfoChange({
                    business_address: { ...businessInfo.business_address!, country: e.target.value }
                  })}
                  className={inputClass}
                  defaultValue="United Kingdom"
                />
              </div>
            </div>
          </div>

          {/* Privacy Settings */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Privacy Settings</h2>
            <div className="space-y-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showInActivityFeed}
                  onChange={(e) => {
                    setShowInActivityFeed(e.target.checked);
                    setHasUnsavedChanges(true);
                  }}
                  className="mt-1 rounded text-yellow-500 focus:ring-yellow-500"
                />
                <div>
                  <span className="font-medium text-gray-900">Show in Live Activity Feed</span>
                  <p className="text-sm text-gray-600 mt-0.5">
                    When enabled, your new listings and sales will appear in the homepage activity feed. 
                    Disable this for more privacy.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end gap-4">
            <button
              onClick={() => router.back()}
              className="px-6 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !businessInfo.business_name || !businessInfo.business_type}
              className="px-6 py-2 bg-yellow-500 text-black font-semibold rounded-lg hover:bg-yellow-600 disabled:opacity-50 flex items-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
        {/* Crop Modal */}
        {cropOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60" onClick={() => setCropOpen(null)} />
            <div className="relative bg-white rounded-xl shadow-2xl w-[90vw] max-w-2xl">
              <div className="p-4 border-b flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">
                  {cropOpen === 'logo' ? 'Crop Business Logo' : 'Crop Storefront Banner'}
                </h3>
                <button className="p-2 rounded hover:bg-gray-100" onClick={() => setCropOpen(null)} aria-label="Close cropper">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4">
                <div className="relative w-full h-[50vh] bg-gray-100 rounded-lg overflow-hidden">
                  {cropSrc && (
                    <Cropper
                      image={cropSrc}
                      crop={crop}
                      zoom={zoom}
                      aspect={cropOpen === 'logo' ? 1 : 1920/400}
                      onCropChange={setCrop}
                      onZoomChange={setZoom}
                      onCropComplete={onCropComplete}
                      showGrid={false}
                      cropShape={'rect'}
                    />
                  )}
                  {cropOpen === 'logo' && (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                      <div className="w-48 h-48 rounded-full ring-2 ring-white/70" />
                    </div>
                  )}
                </div>
                <div className="mt-4 flex items-center gap-4">
                  <label className="text-sm text-gray-600">Zoom</label>
                  <input type="range" min={1} max={3} step={0.01} value={zoom} onChange={(e) => setZoom(parseFloat(e.target.value))} className="w-full" />
                </div>
              </div>
              <div className="p-4 border-t flex items-center justify-end gap-2">
                <button className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50" onClick={() => setCropOpen(null)}>Cancel</button>
                <button className="px-4 py-2 rounded-lg bg-yellow-500 text-black font-medium hover:bg-yellow-600 inline-flex items-center gap-2" onClick={confirmCrop}>
                  <Check className="w-4 h-4" /> Apply
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
