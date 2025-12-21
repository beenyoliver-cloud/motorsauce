"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Upload, X, ChevronDown, Plus, ShieldAlert, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { uploadImage } from '@/lib/storage';
import { createListing } from '@/lib/listingsService';
import { validateFileSize, validateTotalSize, MAX_FILE_SIZE, MAX_TOTAL_SIZE } from '@/lib/storage';
import { VEHICLES as VEHICLES_FALLBACK } from '@/data/vehicles';
import { addVehicle, removeVehicle, vehiclesToArray, type SelectedVehicle } from '@/lib/vehicleHelpers';
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getMainCategories, getSubcategoriesForMain, type MainCategory } from '@/data/partCategories';
import { supabaseBrowser } from "@/lib/supabase";

type Category = "OEM" | "Aftermarket" | "Tool" | "";
type Condition = "New" | "Used - Like New" | "Used - Good" | "Used - Fair";
type ShippingOption = "collection" | "delivery" | "both";

type Img = { id: string; file: File; url: string };
type VehiclesMap = Record<string, string[]>;

export default function SellPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);
  const [sellerGate, setSellerGate] = useState<{ status: "checking" | "allowed" | "pending" | "blocked"; message?: string; detail?: string }>({ status: "checking" });

  const evaluateSellerStatus = useCallback(async (userId: string) => {
    try {
      const supabase = supabaseBrowser();
      const { data: profile } = await supabase
        .from("profiles")
        .select("account_type, business_verified, verification_status, verification_notes")
        .eq("id", userId)
        .single();

      if (!profile) {
        setSellerGate({ status: "blocked", message: "We couldn't load your profile.", detail: "Try refreshing or contact support." });
        return;
      }

      const accountType = profile.account_type ?? "individual";
      const isBusinessAccount = accountType === "business";

      if (!isBusinessAccount) {
        setSellerGate({ status: "allowed" });
        return;
      }

      if (profile.business_verified) {
        setSellerGate({ status: "allowed" });
        return;
      }

      const { data: verificationRows } = await supabase
        .from("seller_verifications")
        .select("status, review_notes, created_at")
        .eq("profile_id", userId)
        .order("created_at", { ascending: false })
        .limit(1);

      const latest = verificationRows && verificationRows.length > 0 ? verificationRows[0] : null;
      const statusFromProfile = (profile.verification_status as string) || (latest?.status as string) || "unverified";

      if (latest?.status === "pending" || statusFromProfile === "pending") {
        setSellerGate({
          status: "pending",
          message: "Your documents are being reviewed.",
          detail: "We'll email you as soon as you're approved.",
        });
        return;
      }

      if (latest?.status === "rejected" || statusFromProfile === "rejected") {
        setSellerGate({
          status: "blocked",
          message: "Your last verification submission needs attention.",
          detail: latest?.review_notes || profile.verification_notes || "Upload updated documents in Business Settings.",
        });
        return;
      }

      setSellerGate({
        status: "blocked",
        message: "Verification required before listing parts.",
        detail: "Upload documents in Business Settings so we can approve your storefront.",
      });
    } catch (err) {
      console.error("Failed to evaluate seller status", err);
      setSellerGate({
        status: "blocked",
        message: "Unable to confirm your seller status right now.",
        detail: "Please refresh the page or contact support if this continues.",
      });
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const u = await getCurrentUser();
        setIsAuthed(!!u);
        if (u) {
          await evaluateSellerStatus(u.id);
        } else {
          setSellerGate({ status: "blocked", message: "Sign in to list parts." });
        }
      } finally {
        setAuthChecked(true);
      }
    })();
  }, [evaluateSellerStatus]);

  if (!authChecked) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-12">
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-gray-800">Checking your account…</div>
      </section>
    );
  }

  if (!isAuthed) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-12">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-gray-900">
          <h1 className="text-2xl font-bold mb-2">Sign in to sell</h1>
          <p className="text-sm text-gray-700 mb-4">You need an account to list parts for sale.</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/auth/login?next=/sell" className="inline-flex items-center px-4 py-2 rounded-md bg-gold-500 text-black font-semibold hover:bg-gold-600">Sign in</Link>
            <Link href="/auth/register?next=/sell" className="inline-flex items-center px-4 py-2 rounded-md border border-gray-300 text-gray-900 bg-white hover:bg-gray-50">Create account</Link>
          </div>
        </div>
      </section>
    );
  }

  if (sellerGate.status === "checking") {
    return (
      <section className="mx-auto max-w-3xl px-4 py-12">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-gray-700">
          <p>Confirming your seller status…</p>
        </div>
      </section>
    );
  }

  if (sellerGate.status !== "allowed") {
    return (
      <section className="mx-auto max-w-3xl px-4 py-12">
        <div className="rounded-2xl border border-yellow-200 bg-white p-8 text-gray-900 shadow-sm">
          <div className="flex items-center gap-3 text-yellow-700">
            {sellerGate.status === "pending" ? (
              <ShieldCheck className="h-6 w-6" />
            ) : (
              <ShieldAlert className="h-6 w-6 text-red-600" />
            )}
            <h1 className="text-xl font-semibold">
              {sellerGate.status === "pending" ? "Verification in progress" : "Verification required"}
            </h1>
          </div>
          <p className="mt-3 text-sm text-gray-700">{sellerGate.message}</p>
          {sellerGate.detail && <p className="mt-1 text-sm text-gray-500">{sellerGate.detail}</p>}
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/settings/business"
              className="inline-flex items-center rounded-md bg-yellow-500 px-4 py-2 text-sm font-semibold text-black hover:bg-yellow-400"
            >
              Go to Business Settings
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-800 hover:border-yellow-400 hover:text-yellow-700"
            >
              Contact support
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">List Your Part</h1>
          <p className="text-lg text-gray-600">Fill in the details below to create your listing</p>
          <p className="text-sm text-gray-500 mt-2">Fields marked with <span className="text-red-500">*</span> are required</p>
        </div>

        <div className="mb-6 rounded-2xl border border-yellow-200 bg-yellow-50 p-5 text-left text-yellow-900 shadow-sm space-y-3">
          <div className="flex items-center gap-3">
            <ShieldAlert className="h-6 w-6 text-yellow-600" />
            <div>
              <p className="font-semibold text-base">Stay safe on Motorsource</p>
              <p className="text-sm text-yellow-800">
                Only accept payments and complete conversations inside Motorsource. Scammers often push for bank transfers, off-platform couriers, or verification fees.
              </p>
            </div>
          </div>
          <ul className="text-sm text-yellow-800 list-disc pl-5 space-y-1">
            <li>Never share security codes or move the conversation to SMS/WhatsApp.</li>
            <li>Report suspicious buyers via the contact page so we can take action.</li>
            <li>If a deal sounds too good to be true, pause and check with support.</li>
          </ul>
        </div>

        {isAuthed && <SellForm />}
      </div>
    </section>
  );
}

function SellForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<Category>("");
  const [mainCategory, setMainCategory] = useState<MainCategory | "">("");
  const [subcategory, setSubcategory] = useState("");
  const [isUniversal, setIsUniversal] = useState(false);
  const [selectedVehicles, setSelectedVehicles] = useState<SelectedVehicle[]>([]);
  // Temporary state for adding vehicles
  const [tempMake, setTempMake] = useState("");
  const [tempModel, setTempModel] = useState("");
  const [tempYear, setTempYear] = useState<number | undefined>();
  const [oem, setOem] = useState("");
  const [condition, setCondition] = useState<Condition>("Used - Good");
  const [price, setPrice] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);
  const [postcode, setPostcode] = useState("");
  const [sellerLat, setSellerLat] = useState<number | null>(null);
  const [sellerLng, setSellerLng] = useState<number | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [shippingOption, setShippingOption] = useState<ShippingOption>("both");
  const [acceptsReturns, setAcceptsReturns] = useState(false);
  const [returnDays, setReturnDays] = useState<number>(14);
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<Img[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fileValidationError, setFileValidationError] = useState<string | null>(null);
  const [vehiclesExpanded, setVehiclesExpanded] = useState(false);
  const [vehicles, setVehicles] = useState<VehiclesMap>(VEHICLES_FALLBACK);
  const [detailed, setDetailed] = useState<DetailedVehicles | null>(null);

  const dropRef = useRef<HTMLLabelElement>(null);

  const isVehicleSpecific = category !== "Tool" && category !== "";
  const canSubmit = useMemo(() => {
    if (!title.trim()) return false;
    if (!category) return false;
    if (!mainCategory) return false;
    if (!subcategory) return false;
    if (!price || Number.isNaN(Number(price))) return false;
    if (images.length === 0) return false;
    // OEM/Aftermarket REQUIRE vehicles (either multiple vehicles OR universal flag) - MANDATORY
    if (isVehicleSpecific && selectedVehicles.length === 0 && !isUniversal) return false;
    // Validate selected vehicles - just check they have make and model populated
    if (selectedVehicles.length > 0) {
      for (const v of selectedVehicles) {
        if (!v.make.trim() || !v.model.trim()) return false;
      }
    }
    return true;
  }, [title, category, mainCategory, subcategory, price, images.length, isVehicleSpecific, selectedVehicles, isUniversal]);

  useEffect(() => {
    let active = true;
    fetch('/vehicles.json')
      .then(r => (r.ok ? r.json() : null))
      .then((data) => {
        if (!active || !data) return;
        setVehicles(data as VehiclesMap);
      })
      .catch(() => {});
    fetch('/vehicles-detailed.json')
      .then(r => (r.ok ? r.json() : null))
      .then((data) => { if (active && data) setDetailed(data); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  // ---- Image handling ----
  function onPickFiles(list: FileList | null) {
    if (!list) return;
    setFileValidationError(null);
    
    const next: Img[] = [];
    const filesArray = Array.from(list);
    
    for (const file of filesArray) {
      if (!file.type.startsWith("image/")) continue;
      
      const sizeCheck = validateFileSize(file);
      if (!sizeCheck.valid) {
        setFileValidationError(sizeCheck.error || "Invalid file");
        return;
      }
      
      const url = URL.createObjectURL(file);
      next.push({ id: crypto.randomUUID(), file, url });
    }
    
    const newTotal = [...images, ...next];
    const totalCheck = validateTotalSize(newTotal.map(img => img.file));
    if (!totalCheck.valid) {
      setFileValidationError(totalCheck.error || "Total file size too large");
      return;
    }
    
    setImages(newTotal.slice(0, 12));
  }

  function removeImg(id: string) {
    setImages((prev) => prev.filter((i) => i.id !== id));
  }

  useEffect(() => {
    return () => {
      images.forEach((i) => URL.revokeObjectURL(i.url));
    };
  }, [images]);

  // Drag & drop styling
  useEffect(() => {
    const el = dropRef.current;
    if (!el) return;
    const prevent = (e: DragEvent) => { e.preventDefault(); e.stopPropagation(); };
    const onOver = (e: DragEvent) => { prevent(e); el.classList.add("ring-2","ring-gold-400"); };
    const onLeave = (e: DragEvent) => { prevent(e); el.classList.remove("ring-2","ring-gold-400"); };
    const onDrop = (e: DragEvent) => {
      prevent(e);
      el.classList.remove("ring-2","ring-gold-400");
      onPickFiles(e.dataTransfer?.files ?? null);
    };
    el.addEventListener("dragover", onOver);
    el.addEventListener("dragleave", onLeave);
    el.addEventListener("drop", onDrop);
    el.addEventListener("dragenter", prevent);
    el.addEventListener("dragend", onLeave);
    return () => {
      el.removeEventListener("dragover", onOver);
      el.removeEventListener("dragleave", onLeave);
      el.removeEventListener("drop", onDrop);
      el.removeEventListener("dragenter", prevent);
      el.removeEventListener("dragend", onLeave);
    };
  }, []);

  async function handleGeocodePostcode() {
    if (!postcode.trim()) return;
    setGeocoding(true);
    try {
      const response = await fetch(`/api/geocode/postcode?postcode=${encodeURIComponent(postcode)}`);
      if (response.ok) {
        const data = await response.json();
        setSellerLat(data.lat_rounded);
        setSellerLng(data.lng_rounded);
      } else {
        setErrorMsg("Invalid postcode");
      }
    } catch (err) {
      console.error("Geocoding error:", err);
      setErrorMsg("Failed to geocode postcode");
    } finally {
      setGeocoding(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    if (!canSubmit) {
      if (isVehicleSpecific && selectedVehicles.length === 0 && !isUniversal) {
        setErrorMsg("Please select at least one vehicle or mark as universal/generic part.");
        return;
      }
      setErrorMsg("Please fill in required fields and add at least one photo.");
      return;
    }

    setSubmitting(true);
    try {
      const uploadedUrls = await Promise.all(
        images.map((img: Img) => uploadImage(img.file))
      );

      // Convert selected vehicles to database format
      const vehiclesArray = vehiclesToArray(selectedVehicles, isUniversal);
      // For backward compatibility, also set make/model from first vehicle
      const firstVehicle = selectedVehicles[0];

      const listing = await createListing({
        title: title.trim(),
        category,
        // Note: main_category and part_type are not in DB schema yet
        make: firstVehicle?.make.trim() || undefined,
        model: firstVehicle?.model.trim() || undefined,
        year: firstVehicle?.year,
        vehicles: vehiclesArray,
        price: parseFloat(price),
        quantity,
        postcode: postcode.trim() || undefined,
        seller_postcode: postcode.trim() || undefined,
        seller_lat: sellerLat,
        seller_lng: sellerLng,
        shipping_option: shippingOption,
        accepts_returns: acceptsReturns,
        return_days: acceptsReturns ? returnDays : undefined,
        condition,
        description: description.trim(),
        images: uploadedUrls,
        status: 'active'
      });

      setSubmitted(true);
      await new Promise(resolve => setTimeout(resolve, 1500));
      router.push(`/listing/${listing.id}`);
    } catch (err) {
      console.error('Error creating listing:', err);
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function saveAsDraft() {
    setErrorMsg(null);
    
    // Minimum validation for drafts - just need a title
    if (!title.trim()) {
      setErrorMsg("Please enter a title before saving as draft.");
      return;
    }

    setSubmitting(true);
    try {
      const uploadedUrls = images.length > 0 
        ? await Promise.all(images.map((img: Img) => uploadImage(img.file)))
        : [];

      // Convert selected vehicles to database format
      const vehiclesArray = selectedVehicles.length > 0 
        ? vehiclesToArray(selectedVehicles, isUniversal)
        : [];
      const firstVehicle = selectedVehicles[0];

      // Build listing data with only defined values
      const listingData: any = {
        title: title.trim(),
        category: category || 'OEM',
        condition: condition || 'Used - Good',
        price: price ? parseFloat(price) : 0,
        quantity: quantity || 1,
        shipping_option: shippingOption || 'both',
        accepts_returns: acceptsReturns,
        description: description.trim() || '',
        images: uploadedUrls, // Only use images array, not image_url
        status: 'draft',
        draft_reason: 'Saved as draft - incomplete listing'
      };

      // Add optional fields only if they have values
      // Note: main_category and part_type are not in DB schema yet
      if (firstVehicle?.make) listingData.make = firstVehicle.make.trim();
      if (firstVehicle?.model) listingData.model = firstVehicle.model.trim();
      if (firstVehicle?.year) listingData.year = firstVehicle.year;
      if (vehiclesArray.length > 0) listingData.vehicles = vehiclesArray;
      if (postcode.trim()) {
        listingData.postcode = postcode.trim();
        listingData.seller_postcode = postcode.trim();
      }
      if (sellerLat) listingData.seller_lat = sellerLat;
      if (sellerLng) listingData.seller_lng = sellerLng;
      if (acceptsReturns && returnDays) listingData.return_days = returnDays;

      console.log('Attempting to save draft with data:', listingData);
      const listing = await createListing(listingData);
      console.log('Draft saved successfully:', listing);

      setSubmitted(true);
      await new Promise(resolve => setTimeout(resolve, 1000));
      router.push('/profile');
    } catch (err) {
      console.error('Error saving draft - Full error:', err);
      console.error('Error details:', {
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
        fullError: JSON.stringify(err, null, 2)
      });
      
      // Try to extract Supabase error details
      if (err && typeof err === 'object') {
        const supabaseErr = err as any;
        if (supabaseErr.code || supabaseErr.details || supabaseErr.hint) {
          console.error('Supabase error details:', {
            code: supabaseErr.code,
            details: supabaseErr.details,
            hint: supabaseErr.hint,
            message: supabaseErr.message
          });
          setErrorMsg(`Database error: ${supabaseErr.message || supabaseErr.details || 'Unknown error'}`);
          return;
        }
      }
      
      setErrorMsg(err instanceof Error ? err.message : "Failed to save draft. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      {/* Essential Details Card */}
      <div className="bg-white border-2 border-gray-100 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-gray-100">
          <div className="w-10 h-10 bg-gradient-to-br from-gold-400 to-gold-600 rounded-xl flex items-center justify-center">
            <span className="text-xl text-white font-bold">1</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900">Essential Details</h2>
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-2">
            Listing Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Vauxhall Astra J Front Brake Pads"
            className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500 transition-all"
            required
          />
          <p className="mt-2 text-xs text-gray-500 flex items-center gap-1.5">
            Be specific. Good titles sell faster.
          </p>
        </div>

        {/* Category & Condition */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-2">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500 transition-all cursor-pointer"
              required
            >
              <option value="">Select a category</option>
              <option value="OEM">OEM</option>
              <option value="Aftermarket">Aftermarket</option>
              <option value="Tool">Tool / Accessory</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-2">
              Condition <span className="text-red-500">*</span>
            </label>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value as Condition)}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500 transition-all cursor-pointer"
            >
              <option>New</option>
              <option>Used - Like New</option>
              <option>Used - Good</option>
              <option>Used - Fair</option>
            </select>
          </div>
        </div>

        {/* Price & Quantity */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-2">
              Price (£) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-semibold text-lg">£</span>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min={0}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                className="w-full border-2 border-gray-200 rounded-xl pl-10 pr-4 py-3 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500 transition-all text-lg font-semibold"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-2">
              Quantity
            </label>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500 transition-all"
            />
          </div>
        </div>

        {/* Part Type - Main Category and Subcategory */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-2">
              Main Category <span className="text-red-500">*</span>
            </label>
            <select
              value={mainCategory}
              onChange={(e) => {
                setMainCategory(e.target.value as MainCategory | "");
                setSubcategory(""); // Reset subcategory when main changes
              }}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500 transition-all cursor-pointer"
              required
            >
              <option value="">Select main category</option>
              {getMainCategories().map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-2">
              Subcategory <span className="text-red-500">*</span>
            </label>
            <select
              value={subcategory}
              onChange={(e) => setSubcategory(e.target.value)}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500 transition-all cursor-pointer disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
              disabled={!mainCategory}
              required
            >
              <option value="">Select subcategory</option>
              {mainCategory && getSubcategoriesForMain(mainCategory).map((sub) => (
                <option key={sub} value={sub}>{sub}</option>
              ))}
            </select>
            {!mainCategory && (
              <p className="mt-2 text-xs text-gray-500 flex items-center gap-1.5">
                <span>↑</span> Select a main category first
              </p>
            )}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-2">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add details: mileage, wear, condition, what's included…"
            className="w-full min-h-[120px] border-2 border-gray-200 rounded-xl px-4 py-3 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500 transition-all resize-y"
            maxLength={1000}
          />
          <div className="mt-2 flex items-center justify-between text-xs">
            <p className="text-gray-500">Add as much detail as possible to help buyers</p>
            <p className={`font-medium ${description.length > 900 ? 'text-orange-600' : 'text-gray-500'}`}>
              {description.length}/1000
            </p>
          </div>
        </div>
      </div>

      {/* Vehicle Details - Collapsible Multi-Vehicle */}
      <div className="border-2 border-gray-100 rounded-2xl overflow-hidden bg-white shadow-lg hover:shadow-xl transition-shadow">
        <button
          type="button"
          onClick={() => setVehiclesExpanded(!vehiclesExpanded)}
          className="w-full flex items-center justify-between px-8 py-5 hover:bg-gradient-to-r hover:from-gray-50 hover:to-white transition-all group"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <span className="text-xl text-white font-bold">2</span>
            </div>
            <div className="text-left">
              <span className="font-bold text-gray-900 text-lg block">
                Vehicle Compatibility {isVehicleSpecific && <span className="text-red-500">*</span>}
              </span>
              {!isVehicleSpecific && <span className="text-sm text-gray-500">Optional for tools & accessories</span>}
            </div>
            {isVehicleSpecific && selectedVehicles.length > 0 && (
              <span className="inline-flex items-center bg-gradient-to-r from-green-500 to-green-600 text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-sm">
                {selectedVehicles.length} selected
              </span>
            )}
            {isUniversal && (
              <span className="inline-flex items-center bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-sm">
                Universal
              </span>
            )}
          </div>
          <ChevronDown className={`w-6 h-6 text-gray-400 transition-transform ${vehiclesExpanded ? "rotate-180" : ""}`} />
        </button>
        
        {vehiclesExpanded && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 space-y-4">
            {isVehicleSpecific ? (
              <>
                <p className="text-xs text-gray-600">This part type requires vehicle compatibility information</p>
                
                {/* Universal Parts Checkbox */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="universal"
                    checked={isUniversal}
                    onChange={(e) => {
                      setIsUniversal(e.target.checked);
                      if (e.target.checked) setSelectedVehicles([]);
                    }}
                    className="h-4 w-4 border border-gray-300 rounded cursor-pointer"
                  />
                  <label htmlFor="universal" className="text-sm font-medium text-gray-700 cursor-pointer">
                    Universal/Generic Part (fits all vehicles)
                  </label>
                </div>

                {!isUniversal && (
                  <div className="space-y-4">
                    {/* Add Vehicle Form */}
                    <div className="rounded-lg bg-white p-4 border border-gray-300">
                      <h3 className="text-sm font-semibold text-gray-900 mb-3">Add Vehicles</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Make *</label>
                          <select
                            value={tempMake}
                            onChange={(e) => { setTempMake(e.target.value); setTempModel(""); }}
                            className="w-full border border-gray-300 rounded-md px-2.5 py-2 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gold-400"
                          >
                            <option value="">Select make</option>
                            {Object.keys(vehicles).sort().map((m) => (
                              <option key={m} value={m}>{m}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Model *</label>
                          <select
                            value={tempModel}
                            onChange={(e) => setTempModel(e.target.value)}
                            className="w-full border border-gray-300 rounded-md px-2.5 py-2 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gold-400"
                            disabled={!tempMake}
                          >
                            <option value="">{tempMake ? "Select model" : "Select make first"}</option>
                            {(vehicles[tempMake] || []).map((mdl) => (
                              <option key={mdl} value={mdl}>{mdl}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Year (Optional)</label>
                          <input
                            type="number"
                            inputMode="numeric"
                            value={tempYear ?? ""}
                            onChange={(e) => setTempYear(e.target.value ? Number(e.target.value) : undefined)}
                            placeholder="2020"
                            min="1990"
                            max={new Date().getFullYear()}
                            className="w-full border border-gray-300 rounded-md px-2.5 py-2 bg-white text-sm text-gray-900 placeholder-gray-450 focus:outline-none focus:ring-2 focus:ring-gold-400"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            if (tempMake.trim() && tempModel.trim()) {
                              setSelectedVehicles(addVehicle(selectedVehicles, tempMake, tempModel, tempYear));
                              setTempMake("");
                              setTempModel("");
                              setTempYear(undefined);
                            }
                          }}
                          disabled={!tempMake.trim() || !tempModel.trim()}
                          className="flex items-center justify-center gap-2 rounded-md bg-gold-600 px-3 py-2 text-sm font-medium text-black hover:bg-gold-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition mt-auto"
                        >
                          <Plus className="h-4 w-4" />
                          Add
                        </button>
                      </div>
                    </div>

                    {/* Selected Vehicles List */}
                    {selectedVehicles.length > 0 && (
                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-900">Selected Vehicles ({selectedVehicles.length})</label>
                        {selectedVehicles.map((v) => (
                          <div key={v.id} className="flex items-center justify-between bg-white p-3 rounded-md border border-gray-300">
                            <div className="text-sm text-gray-900">
                              <strong>{v.make}</strong> {v.model}
                              {v.year && <span className="text-gray-600"> ({v.year})</span>}
                            </div>
                            <button
                              type="button"
                              onClick={() => setSelectedVehicles(removeVehicle(selectedVehicles, v.id))}
                              className="p-1 hover:bg-red-100 text-red-600 rounded transition"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <p className="text-xs text-gray-600">Vehicle details are optional for tools</p>
            )}

            {/* OEM/Part Number - always available */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">OEM/Part Number</label>
              <input
                type="text"
                value={oem}
                onChange={(e) => setOem(e.target.value)}
                placeholder="e.g., 13310065"
                className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-900 placeholder-gray-450 focus:outline-none focus:ring-2 focus:ring-gold-400"
              />
            </div>
          </div>
        )}
      </div>

      {/* Photos Card */}
      <div className="bg-white border-2 border-gray-100 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
        <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl flex items-center justify-center">
              <span className="text-xl text-white font-bold">3</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Photos <span className="text-red-500">*</span>
              </h2>
              <p className="text-sm text-gray-500">Add up to 12 high-quality images</p>
            </div>
          </div>
          <div className="text-right">
            <span className={`text-2xl font-bold ${images.length === 0 ? 'text-gray-400' : 'text-gold-600'}`}>
              {images.length}
            </span>
            <span className="text-sm text-gray-500">/12</span>
          </div>
        </div>

        <label
          ref={dropRef}
          className="flex flex-col items-center justify-center gap-4 border-3 border-dashed border-gray-300 rounded-2xl p-12 text-center cursor-pointer hover:bg-gradient-to-br hover:from-gray-50 hover:to-white hover:border-gold-400 transition-all group"
        >
          <div className="w-16 h-16 bg-gradient-to-br from-gold-100 to-gold-200 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
            <Upload className="h-8 w-8 text-gold-600" />
          </div>
          <div>
            <div className="text-base font-semibold text-gray-700 mb-2">
              Drag photos here or <span className="text-gold-600 font-bold">browse</span>
            </div>
            <div className="text-sm text-gray-500 space-y-1">
              <p>Up to 12 images • {Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB max each</p>
              <p className="text-xs">Total limit: {Math.round(MAX_TOTAL_SIZE / 1024 / 1024)}MB</p>
            </div>
          </div>
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => onPickFiles(e.target.files)}
          />
        </label>

        {fileValidationError && (
          <div className="mt-4 border-2 border-red-300 bg-red-50 text-red-800 rounded-xl p-4 text-sm font-medium flex items-start gap-3">
            <span className="text-xl">⚠️</span>
            <span>{fileValidationError}</span>
          </div>
        )}

        {images.length > 0 && (
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {images.map((img) => (
              <div key={img.id} className="relative group rounded-xl overflow-hidden border-2 border-gray-200 hover:border-gold-400 transition-all shadow-md hover:shadow-lg">
                <img src={img.url} alt="Preview" className="h-36 w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeImg(img.id)}
                  className="absolute top-2 right-2 p-2 rounded-full bg-red-500 hover:bg-red-600 text-white opacity-0 group-hover:opacity-100 transition-all shadow-lg hover:scale-110"
                  aria-label="Remove image"
                >
                  <X className="h-4 w-4" />
                </button>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-white text-xs font-medium">Click × to remove</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Shipping & Returns Card */}
      <div className="bg-white border-2 border-gray-100 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b-2 border-gray-100">
          <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center">
            <span className="text-xl text-white font-bold">4</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900">Shipping & Returns</h2>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-2">
            Shipping Options <span className="text-red-500">*</span>
          </label>
          <select
            value={shippingOption}
            onChange={(e) => setShippingOption(e.target.value as ShippingOption)}
            className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500 transition-all cursor-pointer"
            required
          >
            <option value="both">Collection or Delivery</option>
            <option value="collection">Collection Only</option>
            <option value="delivery">Delivery Only</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-2">
            Location (Postcode)
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              value={postcode}
              onChange={(e) => setPostcode(e.target.value.toUpperCase())}
              placeholder="e.g., SW1A 1AA"
              maxLength={8}
              className="flex-1 border-2 border-gray-200 rounded-xl px-4 py-3 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500 transition-all uppercase font-medium"
            />
            <button
              type="button"
              onClick={handleGeocodePostcode}
              disabled={geocoding || !postcode.trim()}
              className="px-5 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg transition-all"
            >
              {geocoding ? "Checking..." : "Validate"}
            </button>
          </div>
          {sellerLat && sellerLng ? (
            <p className="mt-2 text-sm text-green-700 font-medium flex items-center gap-2 bg-green-50 rounded-lg p-2">
              <span>✓</span>
              Location validated (approximate, for distance calculation)
            </p>
          ) : (
            <p className="mt-2 text-xs text-gray-500">
              Helps buyers see how far the item is from their location
            </p>
          )}
        </div>

        <div className="border-2 border-gray-200 rounded-xl p-5 bg-gradient-to-br from-gray-50 to-white">
          <div className="flex items-start gap-4">
            <input
              type="checkbox"
              id="acceptsReturns"
              checked={acceptsReturns}
              onChange={(e) => setAcceptsReturns(e.target.checked)}
              className="mt-1 h-5 w-5 rounded-lg border-2 border-gray-300 text-gold-500 focus:ring-2 focus:ring-gold-400 cursor-pointer"
            />
            <div className="flex-1">
              <label htmlFor="acceptsReturns" className="block text-sm font-semibold text-gray-800 cursor-pointer mb-1">
                Accept returns
              </label>
              <p className="text-xs text-gray-600">Buyers can return within a set period</p>
            </div>
          </div>

          {acceptsReturns && (
            <div className="mt-4 ml-9 p-4 bg-white rounded-lg border-2 border-green-200">
              <label className="block text-sm font-semibold text-gray-800 mb-2">Return window</label>
              <select
                value={returnDays}
                onChange={(e) => setReturnDays(Number(e.target.value))}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500 transition-all cursor-pointer"
              >
                <option value={7}>7 days</option>
                <option value={14}>14 days (recommended)</option>
                <option value={30}>30 days</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Errors */}
      {errorMsg && (
        <div className="border-2 border-red-300 bg-red-50 text-red-800 rounded-2xl p-6 shadow-lg flex items-start gap-4">
          <span className="text-3xl">⚠️</span>
          <div>
            <h3 className="font-bold text-lg mb-1">Error</h3>
            <p>{errorMsg}</p>
          </div>
        </div>
      )}

      {/* Submit Buttons */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-4">
        <button
          type="submit"
          disabled={!canSubmit || submitting}
          className={`flex-1 sm:flex-none px-10 py-5 rounded-2xl font-bold text-lg transition-all shadow-lg relative overflow-hidden group ${
            !canSubmit || submitting
              ? "bg-gray-200 text-gray-400 cursor-not-allowed border-2 border-gray-300"
              : "bg-gradient-to-r from-gold-500 to-yellow-500 hover:from-gold-600 hover:to-yellow-600 text-black border-2 border-gold-600 hover:border-gold-700 hover:shadow-2xl hover:scale-105 transform"
          }`}
        >
          <span className="relative z-10 flex items-center justify-center gap-2">
            {submitting ? (
              <>
                <span className="animate-spin">...</span>
                Creating Listing…
              </>
            ) : (
              <>
                Create Listing
              </>
            )}
          </span>
          {!submitting && canSubmit && (
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 transform -skew-x-12 group-hover:translate-x-full transition-transform duration-700"></div>
          )}
        </button>

        <button
          type="button"
          onClick={saveAsDraft}
          disabled={!title.trim() || submitting}
          className={`flex-1 sm:flex-none px-8 py-5 rounded-2xl font-semibold text-lg transition-all shadow-md border-2 ${
            !title.trim() || submitting
              ? "bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed"
              : "bg-white text-gray-800 border-gray-300 hover:border-gray-400 hover:bg-gray-50 hover:shadow-lg"
          }`}
        >
          <span className="flex items-center justify-center gap-2">
            Save as Draft
          </span>
        </button>
        <button
          type="button"
          onClick={() => router.push("/")}
          className="flex-1 sm:flex-none px-10 py-5 rounded-2xl font-semibold text-lg border-2 border-gray-300 bg-white hover:bg-gray-50 text-gray-700 transition-all shadow-md hover:shadow-lg"
        >
          Cancel
        </button>
      </div>

      {!canSubmit && !submitting && (
        <div className="flex items-center justify-center gap-2 text-sm text-gray-500 bg-gray-50 rounded-xl p-4 border-2 border-gray-200">
          <span>ℹ️</span>
          <span>Complete all required fields to enable the Create Listing button</span>
        </div>
      )}

      {/* Success */}
      {submitted && (
        <div className="border-2 border-green-300 bg-green-50 text-green-800 rounded-2xl p-6 shadow-lg flex items-start gap-4 animate-pulse">
          <span className="text-3xl">✓</span>
          <div>
            <h3 className="font-bold text-lg mb-1">Success!</h3>
            <p>Your listing has been created. Redirecting you now…</p>
          </div>
        </div>
      )}
    </form>
  );
}

type DetailedModel = {
  name: string;
  production?: Array<{ code?: string | null }>;
  oem_part_prefixes?: Array<string | null>;
};

type DetailedMake = { models?: DetailedModel[] };
type DetailedVehicles = Record<string, DetailedMake | undefined>;

function getGenOptions(detailed: DetailedVehicles | null, make: string, model: string): string[] {
  try {
    if (!detailed || !make || !model) return [];
    const m = detailed[make]?.models?.find((x) => x.name === model);
    if (!m) return [];
    const codes = new Set<string>();
    (m.production || []).forEach((p) => { if (p?.code) codes.add(String(p.code)); });
    (m.oem_part_prefixes || []).forEach((c) => { if (c) codes.add(String(c)); });
    return Array.from(codes).sort();
  } catch { return []; }
}
