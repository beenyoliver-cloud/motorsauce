"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Upload, X, HelpCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { uploadImage } from '@/lib/storage';
import { createListing } from '@/lib/listingsService';
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
  // Auth gate: require login to sell
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
            <Link href="/auth/login?next=/sell" className="inline-flex items-center px-4 py-2 rounded-md bg-yellow-500 text-black font-semibold hover:bg-yellow-600">Sign in</Link>
            <Link href="/auth/register?next=/sell" className="inline-flex items-center px-4 py-2 rounded-md border border-gray-300 text-gray-900 bg-white hover:bg-gray-50">Create account</Link>
          </div>
        </div>
      </section>
    );
  }
  // Render auth gate states, otherwise mount the form component
  return (
    <section className="page-center px-4 py-10">
      <h1 className="text-2xl font-bold text-black mb-6">Sell a Part</h1>

      {isAuthed && <SellForm />}
    </section>
  );
}

function SellForm() {
  const router = useRouter();

  // ---- Form state ----
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
  const [vehicles, setVehicles] = useState<VehiclesMap>(VEHICLES_FALLBACK);
  const [detailed, setDetailed] = useState<DetailedVehicles | null>(null);

  const dropRef = useRef<HTMLLabelElement>(null);

  // ---- Derived ----
  const isVehicleSpecific = category !== "Tool" && category !== "";
  const canSubmit = useMemo(() => {
    if (!title.trim()) return false;
    if (!category) return false;
    if (!price || Number.isNaN(Number(price))) return false;
    if (images.length === 0) return false; // require at least one image
    if (isVehicleSpecific && !make.trim() && !model.trim() && !oem.trim()) return false;
    // If model provided, ensure it exists for selected make
    if (model && (!make || !(vehicles[make] || []).includes(model))) return false;
    return true;
  }, [title, category, price, images.length, isVehicleSpecific, make, model, oem]);

  // Load makes/models dataset (runtime override)
  useEffect(() => {
    let active = true;
    fetch('/vehicles.json')
      .then(r => (r.ok ? r.json() : null))
      .then((data) => {
        if (!active || !data) return;
        setVehicles(data as VehiclesMap);
      })
      .catch(() => {/* ignore - fallback stays */});
    // Try load detailed dataset (optional)
    fetch('/vehicles-detailed.json')
      .then(r => (r.ok ? r.json() : null))
      .then((data) => { if (active && data) setDetailed(data); })
      .catch(() => {/* optional */});
    return () => { active = false; };
  }, []);

  // ---- Image handling ----
  function onPickFiles(list: FileList | null) {
    if (!list) return;
    const next: Img[] = [];
    Array.from(list).forEach((file) => {
      if (!file.type.startsWith("image/")) return;
      const url = URL.createObjectURL(file);
      next.push({ id: crypto.randomUUID(), file, url });
    });
    setImages((prev) => [...prev, ...next].slice(0, 12)); // cap at 12 images
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
    const onOver = (e: DragEvent) => { prevent(e); el.classList.add("ring-2","ring-yellow-400"); };
    const onLeave = (e: DragEvent) => { prevent(e); el.classList.remove("ring-2","ring-yellow-400"); };
    const onDrop = (e: DragEvent) => {
      prevent(e);
      el.classList.remove("ring-2","ring-yellow-400");
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

  // ---- Submit ----
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
      // First upload all images to Supabase storage
      const uploadedUrls = await Promise.all(
        images.map((img: Img) => uploadImage(img.file))
      );

      // Create the listing with uploaded image URLs
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
      
      // Show success message briefly before redirecting
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
    <form onSubmit={onSubmit} className="space-y-8">
        {/* Details card */}
  <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          {/* Title */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">Listing Title *</label>
            <input
              type="text"
              name="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Vauxhall Astra J Front Brake Pads"
              className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-900 placeholder-gray-450 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              required
            />
            <p className="mt-1 text-xs text-gray-600">Clear & specific titles sell faster.</p>
          </div>

          {/* Category & Part Type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
              <select
                name="category"
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                required
              >
                <option value="">Select a category</option>
                <option value="OEM">OEM</option>
                <option value="Aftermarket">Aftermarket</option>
                <option value="Tool">Tool / Accessory</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Part Type</label>
              <select
                name="partType"
                value={partType}
                onChange={(e) => setPartType(e.target.value as PartType)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              >
                <option value="">Select type (optional)</option>
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
          </div>

          {/* Fitment */}
          <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${isVehicleSpecific ? "" : "opacity-60"}`}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Make {isVehicleSpecific ? "(recommended)" : "(optional)"}
              </label>
              <select
                name="make"
                value={make}
                onChange={(e) => { setMake(e.target.value); setModel(""); }}
                className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-400 disabled:bg-gray-100"
                disabled={!isVehicleSpecific}
              >
                <option value="">Select a make</option>
                {Object.keys(vehicles).sort().map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Model {isVehicleSpecific ? "(recommended)" : "(optional)"}
              </label>
              <select
                name="model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-400 disabled:bg-gray-100"
                disabled={!isVehicleSpecific}
              >
                <option value="">{make ? "Select a model" : "Select a make first"}</option>
                {(vehicles[make] || []).map((mdl) => (
                  <option key={mdl} value={mdl}>{mdl}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Generation</label>
              <select
                name="genCode"
                value={genCode}
                onChange={(e) => setGenCode(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-400 disabled:bg-gray-100"
                disabled={!isVehicleSpecific || !make || !model || !getGenOptions(detailed, make, model).length}
              >
                <option value="">{!make || !model ? "Select make & model first" : (getGenOptions(detailed, make, model).length ? "Select a generation (optional)" : "No generations available")}</option>
                {getGenOptions(detailed, make, model).map((g: string) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Engine</label>
              <input
                type="text"
                name="engine"
                value={engine}
                onChange={(e) => setEngine(e.target.value)}
                placeholder="e.g., 1.4T / 2.0 TDI"
                className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-900 placeholder-gray-450 focus:outline-none focus:ring-2 focus:ring-yellow-400 disabled:bg-gray-100"
                disabled={!isVehicleSpecific}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Year (from)</label>
              <input
                type="number"
                name="yearFrom"
                inputMode="numeric"
                value={yearFrom ?? ""}
                onChange={(e) => setYearFrom(e.target.value ? Number(e.target.value) : undefined)}
                placeholder="2012"
                className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-900 placeholder-gray-450 focus:outline-none focus:ring-2 focus:ring-yellow-400 disabled:bg-gray-100"
                disabled={!isVehicleSpecific}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Year (to)</label>
              <input
                type="number"
                name="yearTo"
                inputMode="numeric"
                value={yearTo ?? ""}
                onChange={(e) => setYearTo(e.target.value ? Number(e.target.value) : undefined)}
                placeholder="2018"
                className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-900 placeholder-gray-450 focus:outline-none focus:ring-2 focus:ring-yellow-400 disabled:bg-gray-100"
                disabled={!isVehicleSpecific}
              />
            </div>
          </div>

          {/* OEM / Quantity */}
          <div className="grid grid-cols-1 md:grid-cols-[1fr_140px] gap-4 mt-4">
            <div>
              <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">
                OEM / Part Number <HelpCircle className="h-4 w-4 text-gray-400" />
              </label>
              <input
                type="text"
                name="oem"
                value={oem}
                onChange={(e) => setOem(e.target.value)}
                placeholder="e.g., 13310065"
                className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-900 placeholder-gray-450 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
              <input
                type="number"
                name="quantity"
                inputMode="numeric"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
            </div>
          </div>

          {/* Condition & Price */}
          <div className="grid grid-cols-1 md:grid-cols-[1fr_220px] gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Condition</label>
              <select
                name="condition"
                value={condition}
                onChange={(e) => setCondition(e.target.value as Condition)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              >
                <option>New</option>
                <option>Used - Like New</option>
                <option>Used - Good</option>
                <option>Used - Fair</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price *</label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-600">£</span>
                <input
                  type="number"
                  name="price"
                  inputMode="decimal"
                  step="0.01"
                  min={0}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full border border-gray-300 rounded-md pl-7 pr-3 py-2 bg-white text-gray-900 placeholder-gray-450 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  required
                />
              </div>
            </div>
          </div>

          {/* Location & Shipping */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location (Postcode)
              </label>
              <input
                type="text"
                name="postcode"
                value={postcode}
                onChange={(e) => setPostcode(e.target.value.toUpperCase())}
                placeholder="e.g., SW1A 1AA"
                maxLength={8}
                className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-900 placeholder-gray-450 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
              <p className="mt-1 text-xs text-gray-600">Helps buyers estimate shipping costs</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Shipping Options *</label>
              <select
                name="shippingOption"
                value={shippingOption}
                onChange={(e) => setShippingOption(e.target.value as ShippingOption)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                required
              >
                <option value="both">Collection or Delivery</option>
                <option value="collection">Collection Only</option>
                <option value="delivery">Delivery Only</option>
              </select>
            </div>
          </div>

          {/* Returns Policy */}
          <div className="mt-4 border border-gray-200 rounded-lg p-4 bg-gray-50">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="acceptsReturns"
                checked={acceptsReturns}
                onChange={(e) => setAcceptsReturns(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-yellow-500 focus:ring-yellow-400"
              />
              <div className="flex-1">
                <label htmlFor="acceptsReturns" className="block text-sm font-medium text-gray-700 cursor-pointer">
                  Accept returns
                </label>
                <p className="text-xs text-gray-600 mt-0.5">Buyers can return within a set number of days</p>
              </div>
            </div>

            {acceptsReturns && (
              <div className="mt-3 ml-7">
                <label className="block text-sm font-medium text-gray-700 mb-1">Return window (days)</label>
                <select
                  name="returnDays"
                  value={returnDays}
                  onChange={(e) => setReturnDays(Number(e.target.value))}
                  className="w-40 border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                >
                  <option value={7}>7 days</option>
                  <option value={14}>14 days</option>
                  <option value={30}>30 days</option>
                </select>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              name="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add any useful details: mileage, wear, defects, what's included, shipping/collection…"
              className="w-full min-h-[120px] border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-900 placeholder-gray-450 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              maxLength={1000}
            />
            <p className="mt-1 text-xs text-gray-600">{description.length}/1000</p>
          </div>
        </div>

        {/* Photos card */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-black mb-3">Photos *</h2>

          <label
            ref={dropRef}
            className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:bg-gray-50"
          >
            <Upload className="h-6 w-6 text-gray-500" />
            <div className="text-sm text-gray-700">
              Drag & drop photos here, or <span className="text-yellow-600 font-semibold">browse</span>
            </div>
            <div className="text-xs text-gray-600">Up to 12 images • JPG/PNG/WebP • Max ~10MB each</div>
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => onPickFiles(e.target.files)}
            />
          </label>

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

        {/* Errors */}
        {errorMsg && (
          <div className="border border-red-200 bg-red-50 text-red-800 rounded-lg p-3">
            {errorMsg}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={!canSubmit || submitting}
            className={`px-5 py-2.5 rounded-md font-semibold ${
              !canSubmit || submitting
                ? "bg-yellow-300 text-black cursor-not-allowed"
                : "bg-yellow-500 hover:bg-yellow-600 text-black"
            }`}
          >
            {submitting ? "Listing…" : "List Item"}
          </button>
          {/* Draft feature will be implemented with Supabase */}
        </div>

        {/* Success message */}
        {submitted && (
          <div className="border border-green-200 bg-green-50 text-green-800 rounded-lg p-3">
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
