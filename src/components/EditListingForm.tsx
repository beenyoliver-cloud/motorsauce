"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Upload, X } from "lucide-react";
import { uploadImage } from "@/lib/storage";
import { VEHICLES as VEHICLES_FALLBACK } from "@/data/vehicles";
import { updateListing } from "@/lib/listingsService";

type Category = "OEM" | "Aftermarket" | "Tool" | "";
type Condition = "New" | "Used - Like New" | "Used - Good" | "Used - Fair";
type ShippingOption = "collection" | "delivery" | "both";

type EditableListing = {
  id?: string | number;
  title?: string;
  category?: string;
  part_type?: string;
  make?: string;
  model?: string;
  year?: number;
  condition?: string;
  price?: number | string;
  quantity?: number;
  postcode?: string;
  shipping_option?: string;
  accepts_returns?: boolean;
  return_days?: number;
  description?: string;
  images?: string[];
};

interface EditListingFormProps {
  listing: EditableListing;
}

export default function EditListingForm({ listing }: EditListingFormProps) {
  const router = useRouter();

  // Core fields
  const [title, setTitle] = useState<string>(listing.title ?? "");
  const [category, setCategory] = useState<Category>((listing.category as Category) ?? "");
  const [partType, setPartType] = useState<string>(listing.part_type ?? "");
  const [make, setMake] = useState<string>(listing.make ?? "");
  const [model, setModel] = useState<string>(listing.model ?? "");
  const [year, setYear] = useState<number | undefined>(listing.year ?? undefined);
  const [genCode, setGenCode] = useState<string>("");
  const [condition, setCondition] = useState<Condition>((listing.condition as Condition) ?? "Used - Good");
  const [price, setPrice] = useState<string>(String(listing.price ?? ""));
  const [quantity, setQuantity] = useState<number>(listing.quantity ?? 1);
  const [postcode, setPostcode] = useState<string>(listing.postcode ?? "");
  const [shippingOption, setShippingOption] = useState<ShippingOption>((listing.shipping_option as ShippingOption) ?? "both");
  const [acceptsReturns, setAcceptsReturns] = useState<boolean>(Boolean(listing.accepts_returns));
  const [returnDays, setReturnDays] = useState<number>(listing.return_days ?? 14);
  const [description, setDescription] = useState<string>(listing.description ?? "");

  // New: Location for distance calculation
  const [sellerLat, setSellerLat] = useState<number | null>((listing as any).seller_lat ?? null);
  const [sellerLng, setSellerLng] = useState<number | null>((listing as any).seller_lng ?? null);
  const [geocoding, setGeocoding] = useState(false);

  // Images
  const [existingImages, setExistingImages] = useState<string[]>(Array.isArray(listing.images) ? listing.images : []);
  const [newFiles, setNewFiles] = useState<File[]>([]);

  // UI
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const dropRef = useRef<HTMLLabelElement>(null);
  const [vehicles, setVehicles] = useState<Record<string, string[]>>(VEHICLES_FALLBACK);
  const [detailed, setDetailed] = useState<DetailedVehicles | null>(null);

  const isVehicleSpecific = category !== "Tool" && category !== "";
  const canSave = useMemo(() => {
    if (!title.trim()) return false;
    const priceNum = Number(price);
    if (!price || Number.isNaN(priceNum)) return false;
    if (existingImages.length + newFiles.length === 0) return false;
    if (model && (!make || !(vehicles[make] || []).includes(model))) return false;
    return true;
  }, [title, price, existingImages.length, newFiles.length, make, model, vehicles]);

  function onPickImages(files: FileList | null) {
    if (!files) return;
    const arr = Array.from(files).filter(f => f.type.startsWith("image/"));
    setNewFiles(prev => [...prev, ...arr].slice(0, Math.max(0, 10 - existingImages.length)));
  }

  function removeExisting(idx: number) {
    setExistingImages(prev => prev.filter((_, i) => i !== idx));
  }

  function removeNew(idx: number) {
    setNewFiles(prev => prev.filter((_, i) => i !== idx));
  }

  // Drag & drop styling setup
  useEffect(() => {
    const el = dropRef.current;
    if (!el) return;
    const prevent = (e: DragEvent) => { e.preventDefault(); e.stopPropagation(); };
    const onOver = (e: DragEvent) => { prevent(e); el.classList.add("ring-2","ring-yellow-400"); };
    const onLeave = (e: DragEvent) => { prevent(e); el.classList.remove("ring-2","ring-yellow-400"); };
    const onDrop = (e: DragEvent) => { prevent(e); el.classList.remove("ring-2","ring-yellow-400"); onPickImages(e.dataTransfer?.files ?? null); };
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

  // Load vehicles dataset (runtime override)
  useEffect(() => {
    let active = true;
    fetch('/vehicles.json')
      .then(r => (r.ok ? r.json() : null))
      .then((data) => { if (active && data) setVehicles(data as Record<string, string[]>); })
      .catch(() => {/* ignore */});
    fetch('/vehicles-detailed.json')
      .then(r => (r.ok ? r.json() : null))
      .then((data) => { if (active && data) setDetailed(data); })
      .catch(() => {/* optional */});
    return () => { active = false; };
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
        setError("Invalid postcode");
      }
    } catch (err) {
      console.error("Geocoding error:", err);
      setError("Failed to geocode postcode");
    } finally {
      setGeocoding(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!canSave) return;
    setSaving(true);
    try {
      let uploaded: string[] = [];
      if (newFiles.length) {
        uploaded = await Promise.all(newFiles.map(f => uploadImage(f)));
      }
      const nextImages = [...existingImages, ...uploaded].slice(0, 10);

      await updateListing(String(listing.id), {
        title: title.trim(),
        category,
        part_type: partType || undefined,
        make: make.trim(),
        model: model.trim(),
        year: year ?? undefined,
        condition,
        price: parseFloat(String(price)),
        quantity: Number.isFinite(quantity) ? Math.max(1, quantity) : 1,
        postcode: postcode.trim() || undefined,
        shipping_option: shippingOption,
        accepts_returns: acceptsReturns,
        return_days: acceptsReturns ? returnDays : undefined,
        description: description.trim(),
        images: nextImages,
        seller_postcode: postcode.trim() || undefined,
        seller_lat: sellerLat,
        seller_lng: sellerLng,
        status: 'active'
      });

      router.replace(`/listing/${listing.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save changes");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveAsDraft() {
    setError(null);
    setSaving(true);
    try {
      let uploaded: string[] = [];
      if (newFiles.length) {
        uploaded = await Promise.all(newFiles.map(f => uploadImage(f)));
      }
      const nextImages = [...existingImages, ...uploaded].slice(0, 10);

      await updateListing(String(listing.id), {
        title: title.trim(),
        category,
        part_type: partType || undefined,
        make: make.trim(),
        model: model.trim(),
        year: year ?? undefined,
        condition,
        price: price ? parseFloat(String(price)) : 0,
        quantity: Number.isFinite(quantity) ? Math.max(1, quantity) : 1,
        postcode: postcode.trim() || undefined,
        shipping_option: shippingOption,
        accepts_returns: acceptsReturns,
        return_days: acceptsReturns ? returnDays : undefined,
        description: description.trim(),
        images: nextImages,
        seller_postcode: postcode.trim() || undefined,
        seller_lat: sellerLat,
        seller_lng: sellerLng,
        status: 'draft'
      });

      router.push('/profile/' + (window as any).currentUser?.name || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save draft");
    } finally {
      setSaving(false);
    }
  }

  async function handleMarkAsSold() {
    if (!confirm("Mark this listing as sold? It will no longer be visible to buyers.")) return;
    setSaving(true);
    try {
      await updateListing(String(listing.id), {
        status: 'sold'
      });
      router.push('/profile/' + (window as any).currentUser?.name || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to mark as sold");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this listing? This cannot be undone.")) return;
    setDeleting(true);
    try {
      await fetch(`/api/listings/${listing.id}`, {
        method: 'DELETE',
      });
      router.push('/profile/' + (window as any).currentUser?.name || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete listing");
    } finally {
      setDeleting(false);
    }
  }

  function onCancel() {
    router.push(`/listing/${listing.id}`);
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
              onChange={(e) => setPartType(e.target.value)}
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
            <input
              type="number"
              name="year"
              inputMode="numeric"
              value={year ?? ""}
              onChange={(e) => setYear(e.target.value ? Number(e.target.value) : undefined)}
              placeholder="2018"
              className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-900 placeholder-gray-450 focus:outline-none focus:ring-2 focus:ring-yellow-400 disabled:bg-gray-100"
              disabled={!isVehicleSpecific}
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

        {/* Quantity */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
          <input
            type="number"
            name="quantity"
            inputMode="numeric"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
            className="w-40 border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-400"
          />
        </div>

        {/* Location & Shipping */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location (Postcode)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                name="postcode"
                value={postcode}
                onChange={(e) => setPostcode(e.target.value.toUpperCase())}
                placeholder="e.g., SW1A 1AA"
                maxLength={8}
                className="flex-1 border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-900 placeholder-gray-450 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
              <button
                type="button"
                onClick={handleGeocodePostcode}
                disabled={geocoding || !postcode.trim()}
                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-sm font-medium disabled:opacity-50"
              >
                {geocoding ? "..." : "Validate"}
              </button>
            </div>
            {sellerLat && sellerLng ? (
              <p className="mt-1 text-xs text-green-600">✓ Location validated (approximate, for distance calc)</p>
            ) : (
              <p className="mt-1 text-xs text-gray-600">Helps buyers see distance from their location</p>
            )}
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
        <h2 className="text-sm font-semibold text-black mb-3">Photos</h2>

        <label
          ref={dropRef}
          className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:bg-gray-50"
        >
          <Upload className="h-6 w-6 text-gray-500" />
          <div className="text-sm text-gray-700">
            Drag & drop photos here, or <span className="text-yellow-600 font-semibold">browse</span>
          </div>
          <div className="text-xs text-gray-600">Up to 10 images • JPG/PNG/WebP • Max ~10MB each</div>
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => onPickImages(e.target.files)}
          />
        </label>

        {(existingImages.length > 0 || newFiles.length > 0) && (
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {existingImages.map((img, i) => (
              <div key={`ex-${i}`} className="relative group rounded-lg overflow-hidden border border-gray-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img} alt="Existing" className="site-image" />
                <button
                  type="button"
                  onClick={() => removeExisting(i)}
                  className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition"
                  aria-label="Remove image"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}

            {newFiles.map((f, i) => (
              <div key={`new-${i}`} className="relative group rounded-lg overflow-hidden border border-yellow-300">
                <img src={URL.createObjectURL(f)} alt="New" className="site-image" />
                <button
                  type="button"
                  onClick={() => removeNew(i)}
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
      {error && (
        <div className="border border-red-200 bg-red-50 text-red-800 rounded-lg p-3">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <button
          type="submit"
          disabled={!canSave || saving}
          className={`flex-1 sm:flex-none px-5 py-2.5 rounded-md font-semibold ${
            !canSave || saving
              ? "bg-yellow-300 text-black cursor-not-allowed"
              : "bg-yellow-500 hover:bg-yellow-600 text-black"
          }`}
        >
          {saving ? "Saving…" : "Save & Publish"}
        </button>
        <button
          type="button"
          onClick={handleSaveAsDraft}
          disabled={saving}
          className="flex-1 sm:flex-none px-5 py-2.5 rounded-md font-semibold border border-gray-300 text-gray-800 hover:bg-gray-50 disabled:opacity-50"
        >
          Save as Draft
        </button>
        <button
          type="button"
          onClick={handleMarkAsSold}
          disabled={saving}
          className="flex-1 sm:flex-none px-5 py-2.5 rounded-md font-semibold border border-green-300 bg-green-50 text-green-900 hover:bg-green-100 disabled:opacity-50"
        >
          Mark as Sold
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 sm:flex-none px-5 py-2.5 rounded-md font-semibold border border-gray-300 text-gray-800 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="flex-1 sm:flex-none px-5 py-2.5 rounded-md font-semibold border border-red-300 bg-red-50 text-red-900 hover:bg-red-100 disabled:opacity-50"
        >
          {deleting ? "Deleting..." : "Delete"}
        </button>
      </div>
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
    const entry = detailed[make]?.models?.find((x) => x.name === model);
    if (!entry) return [];
    const codes = new Set<string>();
    (entry.production || []).forEach((p) => { if (p?.code) codes.add(String(p.code)); });
    (entry.oem_part_prefixes || []).forEach((c) => { if (c) codes.add(String(c)); });
    return Array.from(codes).sort();
  } catch { return []; }
}
