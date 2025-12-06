"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Upload, X, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { uploadImage } from '@/lib/storage';
import { createListing } from '@/lib/listingsService';
import { validateFileSize, validateTotalSize, MAX_FILE_SIZE, MAX_TOTAL_SIZE } from '@/lib/storage';
import { VEHICLES as VEHICLES_FALLBACK } from '@/data/vehicles';
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";

type Category = "OEM" | "Aftermarket" | "Tool" | "";
type Condition = "New" | "Used - Like New" | "Used - Good" | "Used - Fair";
type PartType = "" | "Engine" | "Transmission" | "Brakes" | "Suspension" | "Exhaust" | "Body" | "Interior" | "Electrical" | "Wheels" | "Lighting" | "Cooling" | "Fuel System" | "Other";
type ShippingOption = "collection" | "delivery" | "both";

type Img = { id: string; file: File; url: string };
type VehiclesMap = Record<string, string[]>;

export default function SellPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const u = await getCurrentUser();
        setIsAuthed(!!u);
      } finally {
        setAuthChecked(true);
      }
    })();
  }, []);

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

  return (
    <section className="page-center px-4 py-10">
      <h1 className="text-2xl font-bold text-black mb-2">Sell a Part</h1>
      <p className="text-sm text-gray-600 mb-8">Fill in the details below. Required fields are marked with *</p>

      {isAuthed && <SellForm />}
    </section>
  );
}

function SellForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<Category>("");
  const [partType, setPartType] = useState<PartType>("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [genCode, setGenCode] = useState("");
  const [engine, setEngine] = useState("");
  const [yearFrom, setYearFrom] = useState<number | undefined>();
  const [yearTo, setYearTo] = useState<number | undefined>();
  const [oem, setOem] = useState("");
  const [condition, setCondition] = useState<Condition>("Used - Good");
  const [price, setPrice] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);
  const [postcode, setPostcode] = useState("");
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
    if (!price || Number.isNaN(Number(price))) return false;
    if (images.length === 0) return false;
    if (isVehicleSpecific && !make.trim() && !model.trim() && !oem.trim()) return false;
    if (model && (!make || !(vehicles[make] || []).includes(model))) return false;
    return true;
  }, [title, category, price, images.length, isVehicleSpecific, make, model, oem, vehicles]);

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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    if (!canSubmit) {
      if (model && (!make || !(vehicles[make] || []).includes(model))) {
        setErrorMsg("Selected model is not valid for the chosen make.");
      } else {
        setErrorMsg("Please fill in required fields and add at least one photo.");
      }
      return;
    }

    setSubmitting(true);
    try {
      const uploadedUrls = await Promise.all(
        images.map((img: Img) => uploadImage(img.file))
      );

      const listing = await createListing({
        title: title.trim(),
        category,
        part_type: partType || undefined,
        make: make.trim(),
        model: model.trim(),
        year: yearFrom,
        price: parseFloat(price),
        quantity,
        postcode: postcode.trim() || undefined,
        shipping_option: shippingOption,
        accepts_returns: acceptsReturns,
        return_days: acceptsReturns ? returnDays : undefined,
        condition,
        description: description.trim(),
        images: uploadedUrls
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

  return (
    <form onSubmit={onSubmit} className="space-y-6 max-w-2xl">
      {/* Essential Details Card */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-5">
        <div>
          <h2 className="text-sm font-semibold text-black mb-4">Essential Details</h2>
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Listing Title *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Vauxhall Astra J Front Brake Pads"
            className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-900 placeholder-gray-450 focus:outline-none focus:ring-2 focus:ring-gold-400"
            required
          />
          <p className="mt-1 text-xs text-gray-600">Be specific. Good titles sell faster.</p>
        </div>

        {/* Category & Condition */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-gold-400"
              required
            >
              <option value="">Select a category</option>
              <option value="OEM">OEM</option>
              <option value="Aftermarket">Aftermarket</option>
              <option value="Tool">Tool / Accessory</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Condition *</label>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value as Condition)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-gold-400"
            >
              <option>New</option>
              <option>Used - Like New</option>
              <option>Used - Good</option>
              <option>Used - Fair</option>
            </select>
          </div>
        </div>

        {/* Price & Quantity */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Price (£) *</label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-600">£</span>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min={0}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                className="w-full border border-gray-300 rounded-md pl-7 pr-3 py-2 bg-white text-gray-900 placeholder-gray-450 focus:outline-none focus:ring-2 focus:ring-gold-400"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-gold-400"
            />
          </div>
        </div>

        {/* Part Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Part Type (Optional)</label>
          <select
            value={partType}
            onChange={(e) => setPartType(e.target.value as PartType)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-gold-400"
          >
            <option value="">Select type</option>
            <option value="Engine">Engine</option>
            <option value="Transmission">Transmission</option>
            <option value="Brakes">Brakes</option>
            <option value="Suspension">Suspension</option>
            <option value="Exhaust">Exhaust</option>
            <option value="Body">Body Panels</option>
            <option value="Interior">Interior</option>
            <option value="Electrical">Electrical</option>
            <option value="Wheels">Wheels & Tyres</option>
            <option value="Lighting">Lighting</option>
            <option value="Cooling">Cooling System</option>
            <option value="Fuel System">Fuel System</option>
            <option value="Other">Other</option>
          </select>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add details: mileage, wear, condition, what's included…"
            className="w-full min-h-[100px] border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-900 placeholder-gray-450 focus:outline-none focus:ring-2 focus:ring-gold-400"
            maxLength={1000}
          />
          <p className="mt-1 text-xs text-gray-600">{description.length}/1000 characters</p>
        </div>
      </div>

      {/* Vehicle Details - Collapsible */}
      <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
        <button
          type="button"
          onClick={() => setVehiclesExpanded(!vehiclesExpanded)}
          className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition"
        >
          <div className="flex items-center gap-3">
            <span className="font-medium text-gray-900">
              {isVehicleSpecific ? "📍 Vehicle Details" : "📍 Vehicle Details (Optional)"}
            </span>
            {isVehicleSpecific && <span className="inline-block bg-gold-100 text-gold-700 text-xs px-2 py-1 rounded">Recommended</span>}
          </div>
          <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform ${vehiclesExpanded ? "rotate-180" : ""}`} />
        </button>
        
        {vehiclesExpanded && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 space-y-4">
            <p className="text-xs text-gray-600">Adding vehicle details helps buyers find compatible parts</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Make</label>
                <select
                  value={make}
                  onChange={(e) => { setMake(e.target.value); setModel(""); }}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-gold-400 disabled:bg-gray-100"
                  disabled={!isVehicleSpecific}
                >
                  <option value="">Select a make</option>
                  {Object.keys(vehicles).sort().map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Model</label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-gold-400 disabled:bg-gray-100"
                  disabled={!isVehicleSpecific}
                >
                  <option value="">{make ? "Select a model" : "Select make first"}</option>
                  {(vehicles[make] || []).map((mdl) => (
                    <option key={mdl} value={mdl}>{mdl}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Year From</label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={yearFrom ?? ""}
                  onChange={(e) => setYearFrom(e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="2012"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-900 placeholder-gray-450 focus:outline-none focus:ring-2 focus:ring-gold-400 disabled:bg-gray-100"
                  disabled={!isVehicleSpecific}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Year To</label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={yearTo ?? ""}
                  onChange={(e) => setYearTo(e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="2018"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-900 placeholder-gray-450 focus:outline-none focus:ring-2 focus:ring-gold-400 disabled:bg-gray-100"
                  disabled={!isVehicleSpecific}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Engine</label>
                <input
                  type="text"
                  value={engine}
                  onChange={(e) => setEngine(e.target.value)}
                  placeholder="e.g., 1.4T"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-900 placeholder-gray-450 focus:outline-none focus:ring-2 focus:ring-gold-400 disabled:bg-gray-100"
                  disabled={!isVehicleSpecific}
                />
              </div>

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
          </div>
        )}
      </div>

      {/* Photos Card */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-black mb-4">Photos * ({images.length}/12)</h2>

        <label
          ref={dropRef}
          className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:bg-gray-50 transition"
        >
          <Upload className="h-8 w-8 text-gray-400" />
          <div>
            <div className="text-sm font-medium text-gray-700">Drag photos here or <span className="text-gold-600 font-semibold">browse</span></div>
            <div className="text-xs text-gray-600 mt-1">
              Up to 12 images • {Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB max each • {Math.round(MAX_TOTAL_SIZE / 1024 / 1024)}MB total
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
          <div className="mt-3 border border-red-200 bg-red-50 text-red-800 rounded-lg p-3 text-sm">
            {fileValidationError}
          </div>
        )}

        {images.length > 0 && (
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {images.map((img) => (
              <div key={img.id} className="relative group rounded-lg overflow-hidden border border-gray-200">
                <img src={img.url} alt="Preview" className="h-32 w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeImg(img.id)}
                  className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition"
                  aria-label="Remove image"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Shipping & Returns Card */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-semibold text-black">Shipping & Returns</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Shipping Options *</label>
          <select
            value={shippingOption}
            onChange={(e) => setShippingOption(e.target.value as ShippingOption)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-gold-400"
            required
          >
            <option value="both">Collection or Delivery</option>
            <option value="collection">Collection Only</option>
            <option value="delivery">Delivery Only</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Location (Postcode)</label>
          <input
            type="text"
            value={postcode}
            onChange={(e) => setPostcode(e.target.value.toUpperCase())}
            placeholder="e.g., SW1A 1AA"
            maxLength={8}
            className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-900 placeholder-gray-450 focus:outline-none focus:ring-2 focus:ring-gold-400"
          />
        </div>

        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="acceptsReturns"
              checked={acceptsReturns}
              onChange={(e) => setAcceptsReturns(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-gold-500 focus:ring-gold-400"
            />
            <div className="flex-1">
              <label htmlFor="acceptsReturns" className="block text-sm font-medium text-gray-700 cursor-pointer">
                Accept returns
              </label>
              <p className="text-xs text-gray-600 mt-0.5">Buyers can return within a set period</p>
            </div>
          </div>

          {acceptsReturns && (
            <div className="mt-3 ml-7">
              <label className="block text-sm font-medium text-gray-700 mb-2">Return window</label>
              <select
                value={returnDays}
                onChange={(e) => setReturnDays(Number(e.target.value))}
                className="w-40 border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-gold-400"
              >
                <option value={7}>7 days</option>
                <option value={14}>14 days</option>
                <option value={30}>30 days</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Errors */}
      {errorMsg && (
        <div className="border border-red-200 bg-red-50 text-red-800 rounded-lg p-4">
          {errorMsg}
        </div>
      )}

      {/* Submit Button */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={!canSubmit || submitting}
          className={`px-6 py-3 rounded-lg font-semibold transition ${
            !canSubmit || submitting
              ? "bg-gray-300 text-gray-600 cursor-not-allowed"
              : "bg-gold-500 hover:bg-gold-600 text-black"
          }`}
        >
          {submitting ? "Creating Listing…" : "Create Listing"}
        </button>
      </div>

      {/* Success */}
      {submitted && (
        <div className="border border-green-200 bg-green-50 text-green-800 rounded-lg p-4">
          Your listing has been created. Redirecting…
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
