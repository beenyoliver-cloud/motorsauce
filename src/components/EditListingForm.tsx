"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Upload, X, ChevronDown, Plus } from "lucide-react";
import { uploadImage, validateFileSize, validateTotalSize, MAX_FILE_SIZE, MAX_TOTAL_SIZE } from "@/lib/storage";
import { VEHICLES as VEHICLES_FALLBACK } from "@/data/vehicles";
import { updateListing } from "@/lib/listingsService";
import { getMainCategories, getSubcategoriesForMain, type MainCategory } from '@/data/partCategories';
import { addVehicle, removeVehicle, vehiclesToArray, type SelectedVehicle } from '@/lib/vehicleHelpers';
import { supabaseBrowser } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/auth";

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
  const [mainCategory, setMainCategory] = useState<MainCategory | "">((listing as any).main_category ?? "");
  const [subcategory, setSubcategory] = useState<string>(listing.part_type ?? "");
  const [isUniversal, setIsUniversal] = useState(false);
  const [selectedVehicles, setSelectedVehicles] = useState<SelectedVehicle[]>([]);
  const [tempMake, setTempMake] = useState("");
  const [tempModel, setTempModel] = useState("");
  const [tempYear, setTempYear] = useState<number | undefined>();
  const [condition, setCondition] = useState<Condition>((listing.condition as Condition) ?? "Used - Good");
  const [price, setPrice] = useState<string>(String(listing.price ?? ""));
  const [quantity, setQuantity] = useState<number>(listing.quantity ?? 1);
  const [postcode, setPostcode] = useState<string>(listing.postcode ?? "");
  const [shippingOption, setShippingOption] = useState<ShippingOption>((listing.shipping_option as ShippingOption) ?? "both");
  const [acceptsReturns, setAcceptsReturns] = useState<boolean>(Boolean(listing.accepts_returns));
  const [returnDays, setReturnDays] = useState<number>(listing.return_days ?? 14);
  const [description, setDescription] = useState<string>(listing.description ?? "");
  const [vehiclesExpanded, setVehiclesExpanded] = useState(false);
  const [fileValidationError, setFileValidationError] = useState<string | null>(null);

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
    if (!mainCategory) return false;
    if (!subcategory) return false;
    const priceNum = Number(price);
    if (!price || Number.isNaN(priceNum)) return false;
    if (existingImages.length + newFiles.length === 0) return false;
    // Vehicle-specific parts require vehicles unless marked as universal
    if (isVehicleSpecific && selectedVehicles.length === 0 && !isUniversal) return false;
    return true;
  }, [title, mainCategory, subcategory, price, existingImages.length, newFiles.length, isVehicleSpecific, selectedVehicles, isUniversal]);

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

      // Convert selected vehicles to array format
      const vehiclesArray = vehiclesToArray(selectedVehicles, isUniversal);
      const firstVehicle = selectedVehicles[0];
      
      // Build update data with only defined values
      const updateData: any = {
        title: title.trim(),
        category,
        condition,
        price: parseFloat(String(price)),
        quantity: Number.isFinite(quantity) ? Math.max(1, quantity) : 1,
        shipping_option: shippingOption,
        accepts_returns: acceptsReturns,
        description: description.trim(),
        images: nextImages,
        status: 'active'
      };

      // Add optional fields only if they have values
      // Note: main_category and part_type are not in DB schema yet
      if (firstVehicle?.make) updateData.make = firstVehicle.make.trim();
      if (firstVehicle?.model) updateData.model = firstVehicle.model.trim();
      if (firstVehicle?.year) updateData.year = firstVehicle.year;
      if (vehiclesArray.length > 0) updateData.vehicles = vehiclesArray;
      if (postcode.trim()) {
        updateData.postcode = postcode.trim();
        updateData.seller_postcode = postcode.trim();
      }
      if (sellerLat) updateData.seller_lat = sellerLat;
      if (sellerLng) updateData.seller_lng = sellerLng;
      if (acceptsReturns && returnDays) updateData.return_days = returnDays;

      console.log('Updating listing with data:', updateData);
      await updateListing(String(listing.id), updateData);

      router.replace(`/listing/${listing.id}`);
    } catch (err) {
      console.error('Error saving listing:', err);
      console.error('Error details:', {
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      });
      
      // Try to extract Supabase error details
      if (err && typeof err === 'object') {
        const supabaseErr = err as any;
        if (supabaseErr.code || supabaseErr.details || supabaseErr.hint) {
          console.error('Supabase error:', {
            code: supabaseErr.code,
            details: supabaseErr.details,
            hint: supabaseErr.hint,
            message: supabaseErr.message
          });
          setError(`Database error: ${supabaseErr.message || supabaseErr.details || 'Unknown error'}`);
          return;
        }
      }
      
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

      // Convert selected vehicles to array format
      const vehiclesArray = vehiclesToArray(selectedVehicles, isUniversal);
      const firstVehicle = selectedVehicles[0];
      
      await updateListing(String(listing.id), {
        title: title.trim(),
        category,
        // Note: main_category and part_type are not in DB schema yet
        make: firstVehicle?.make.trim() || undefined,
        model: firstVehicle?.model.trim() || undefined,
        year: firstVehicle?.year,
        vehicles: vehiclesArray,
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

      router.push('/profile');
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
      router.push('/profile');
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
      // Get auth token for the API call
      const supabase = supabaseBrowser();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      if (!token) {
        throw new Error("You must be logged in to delete a listing");
      }
      
      const response = await fetch(`/api/listings/${listing.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete listing");
      }
      
      // Redirect to user's profile page after successful deletion
      const user = await getCurrentUser();
      const profileUrl = user?.name ? `/profile/${encodeURIComponent(user.name)}` : '/';
      window.location.href = profileUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete listing");
      setDeleting(false);
    }
  }

  function onCancel() {
    router.push(`/listing/${listing.id}`);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Listing Details Section */}
      <div className="bg-white border-2 border-gray-200 rounded-2xl p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-2xl text-white font-bold">
            1
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Listing Details</h2>
            <p className="text-sm text-gray-600">Essential information about your part</p>
          </div>
        </div>

        {/* Title */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            Listing Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Vauxhall Astra J Front Brake Pads - OEM Quality"
            className="w-full border-2 border-gray-300 rounded-xl py-3 px-4 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500 transition-all"
            required
          />
          <p className="mt-2 text-xs text-gray-500">Clear & specific titles sell faster. Include make, model, and part name.</p>
        </div>

        {/* Category Type */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            Category <span className="text-red-500">*</span>
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as Category)}
            className="w-full border-2 border-gray-300 rounded-xl py-3 px-4 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500 transition-all"
            required
          >
            <option value="">Select a category</option>
            <option value="OEM">OEM (Original Equipment Manufacturer)</option>
            <option value="Aftermarket">Aftermarket (Performance/Replacement)</option>
            <option value="Tool">Tool / Accessory</option>
          </select>
          <p className="mt-2 text-xs text-gray-500">
            OEM for original parts, Aftermarket for replacements/upgrades, Tools for equipment.
          </p>
        </div>

        {/* Part Categories - Main & Subcategory */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Part Category <span className="text-red-500">*</span>
            </label>
            <select
              value={mainCategory}
              onChange={(e) => {
                setMainCategory(e.target.value as MainCategory | "");
                setSubcategory(""); // Reset subcategory when main changes
              }}
              className="w-full border-2 border-gray-300 rounded-xl py-3 px-4 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500 transition-all"
              required
            >
              <option value="">Select main category</option>
              {getMainCategories().map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Subcategory <span className="text-red-500">*</span>
            </label>
            <select
              value={subcategory}
              onChange={(e) => setSubcategory(e.target.value)}
              disabled={!mainCategory}
              className="w-full border-2 border-gray-300 rounded-xl py-3 px-4 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500 transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
              required
            >
              <option value="">{mainCategory ? "Select subcategory" : "Select main category first"}</option>
              {mainCategory &&
                getSubcategoriesForMain(mainCategory).map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
            </select>
          </div>
        </div>

        {/* Condition & Price */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Condition <span className="text-red-500">*</span>
            </label>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value as Condition)}
              className="w-full border-2 border-gray-300 rounded-xl py-3 px-4 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500 transition-all"
              required
            >
              <option>New</option>
              <option>Used - Like New</option>
              <option>Used - Good</option>
              <option>Used - Fair</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Price <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 font-medium">£</span>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min={0}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                className="w-full border-2 border-gray-300 rounded-xl py-3 pl-9 pr-4 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500 transition-all"
                required
              />
            </div>
          </div>
        </div>

        {/* Quantity */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-900 mb-2">Quantity Available</label>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
            className="w-32 border-2 border-gray-300 rounded-xl py-3 px-4 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500 transition-all"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the condition, any defects, what's included, fitment notes, shipping details..."
            className="w-full min-h-[140px] border-2 border-gray-300 rounded-xl py-3 px-4 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500 transition-all resize-y"
            maxLength={1000}
          />
          <p className="mt-2 text-xs text-gray-500">{description.length}/1000 characters</p>
        </div>
      </div>

      {/* Vehicle Compatibility Section */}
      <div className="bg-white border-2 border-gray-200 rounded-2xl p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-2xl text-white font-bold">
            2
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Vehicle Compatibility</h2>
            <p className="text-sm text-gray-600">Which vehicles does this part fit?</p>
          </div>
        </div>

        {/* Universal Part Toggle */}
        <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isUniversal}
              onChange={(e) => {
                setIsUniversal(e.target.checked);
                if (e.target.checked) {
                  setSelectedVehicles([]);
                }
              }}
              className="mt-1 h-5 w-5 rounded border-gray-300 text-gold-500 focus:ring-2 focus:ring-gold-500"
            />
            <div>
              <span className="font-semibold text-gray-900">Universal Part</span>
              <p className="text-sm text-gray-600 mt-1">
                Check this if your part fits multiple vehicles or is a universal/generic item
              </p>
            </div>
          </label>
        </div>

        {/* Vehicle Selection (shown when not universal) */}
        {!isUniversal && (
          <div className="space-y-4">
            {/* Collapsible Add Vehicle Section */}
            <div className="border-2 border-gray-200 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setVehiclesExpanded(!vehiclesExpanded)}
                className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <span className="font-semibold text-gray-900">
                  {selectedVehicles.length > 0 ? `${selectedVehicles.length} Vehicle(s) Added` : "Add Compatible Vehicles"}
                </span>
                <ChevronDown
                  className={`h-5 w-5 text-gray-600 transition-transform ${vehiclesExpanded ? "rotate-180" : ""}`}
                />
              </button>

              {vehiclesExpanded && (
                <div className="p-6 space-y-4 bg-white">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">Make</label>
                      <select
                        value={tempMake}
                        onChange={(e) => {
                          setTempMake(e.target.value);
                          setTempModel("");
                        }}
                        className="w-full border-2 border-gray-300 rounded-xl py-2 px-3 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500 transition-all"
                      >
                        <option value="">Select make</option>
                        {Object.keys(vehicles)
                          .sort()
                          .map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">Model</label>
                      <select
                        value={tempModel}
                        onChange={(e) => setTempModel(e.target.value)}
                        disabled={!tempMake}
                        className="w-full border-2 border-gray-300 rounded-xl py-2 px-3 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500 transition-all disabled:bg-gray-100"
                      >
                        <option value="">{tempMake ? "Select model" : "Select make first"}</option>
                        {tempMake &&
                          (vehicles[tempMake] || []).map((mdl) => (
                            <option key={mdl} value={mdl}>
                              {mdl}
                            </option>
                          ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">Year (optional)</label>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={tempYear ?? ""}
                        onChange={(e) => setTempYear(e.target.value ? Number(e.target.value) : undefined)}
                        placeholder="2018"
                        className="w-full border-2 border-gray-300 rounded-xl py-2 px-3 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500 transition-all"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (tempMake && tempModel) {
                        const newVehicles = addVehicle(selectedVehicles, tempMake, tempModel, tempYear);
                        setSelectedVehicles(newVehicles);
                        setTempMake("");
                        setTempModel("");
                        setTempYear(undefined);
                      }
                    }}
                    disabled={!tempMake || !tempModel}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-gold-500 to-yellow-500 hover:from-gold-600 hover:to-yellow-600 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="h-5 w-5" />
                    Add Vehicle
                  </button>
                </div>
              )}
            </div>

            {/* Selected Vehicles List */}
            {selectedVehicles.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-700">Compatible Vehicles:</p>
                <div className="space-y-2">
                  {selectedVehicles.map((vehicle) => (
                    <div
                      key={vehicle.id}
                      className="flex items-center justify-between p-3 bg-green-50 border-2 border-green-200 rounded-xl"
                    >
                      <span className="text-sm font-medium text-gray-900">
                        {vehicle.make} {vehicle.model}
                        {vehicle.year ? ` (${vehicle.year})` : ""}
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedVehicles(removeVehicle(selectedVehicles, vehicle.id))}
                        className="p-1 hover:bg-red-100 rounded-lg transition-colors text-red-600"
                        aria-label="Remove vehicle"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!isUniversal && selectedVehicles.length === 0 && (
              <p className="text-sm text-amber-700 bg-amber-50 border-2 border-amber-200 rounded-xl p-4">
                ⚠️ Please add at least one compatible vehicle, or mark this as a universal part.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Photos Section */}
      <div className="bg-white border-2 border-gray-200 rounded-2xl p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-2xl text-white font-bold">
            3
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Photos</h2>
            <p className="text-sm text-gray-600">Add up to 10 high-quality images</p>
          </div>
        </div>

        {fileValidationError && (
          <div className="mb-4 p-4 bg-red-50 border-2 border-red-200 text-red-800 rounded-xl">
            {fileValidationError}
          </div>
        )}

        <label
          ref={dropRef}
          className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center cursor-pointer hover:border-gold-500 hover:bg-gradient-to-br hover:from-gold-50 hover:to-yellow-50 transition-all"
        >
          <Upload className="h-8 w-8 text-gray-400" />
          <div className="text-sm text-gray-700">
            <span className="font-semibold text-gold-600">Click to upload</span> or drag and drop
          </div>
          <div className="text-xs text-gray-500">PNG, JPG, WebP up to 12MB each (max 10 images)</div>
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => onPickImages(e.target.files)}
          />
        </label>

        {(existingImages.length > 0 || newFiles.length > 0) && (
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {existingImages.map((img, i) => (
              <div
                key={`ex-${i}`}
                className="relative group rounded-xl overflow-hidden border-2 border-gray-200 aspect-square"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img} alt="Existing" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeExisting(i)}
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                  aria-label="Remove image"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}

            {newFiles.map((f, i) => (
              <div
                key={`new-${i}`}
                className="relative group rounded-xl overflow-hidden border-2 border-gold-400 aspect-square"
              >
                <img src={URL.createObjectURL(f)} alt="New" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeNew(i)}
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                  aria-label="Remove image"
                >
                  <X className="h-4 w-4" />
                </button>
                <div className="absolute bottom-2 left-2 px-2 py-1 bg-gold-500 text-white text-xs font-semibold rounded-lg">
                  NEW
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Shipping & Location Section */}
      <div className="bg-white border-2 border-gray-200 rounded-2xl p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-2xl text-white font-bold">
            4
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Shipping & Location</h2>
            <p className="text-sm text-gray-600">How buyers can receive the part</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Your Postcode <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={postcode}
                onChange={(e) => setPostcode(e.target.value.toUpperCase())}
                placeholder="e.g., SW1A 1AA"
                maxLength={8}
                className="flex-1 border-2 border-gray-300 rounded-xl py-3 px-4 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500 transition-all"
                required
              />
              <button
                type="button"
                onClick={handleGeocodePostcode}
                disabled={geocoding || !postcode.trim()}
                className="px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-semibold disabled:opacity-50 transition-colors"
              >
                {geocoding ? "..." : "Verify"}
              </button>
            </div>
            {sellerLat && sellerLng ? (
              <p className="mt-2 text-xs text-green-600 flex items-center gap-1">
                <span className="font-semibold">✓</span> Location verified
              </p>
            ) : (
              <p className="mt-2 text-xs text-gray-500">Used to calculate distance for buyers</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Shipping Options <span className="text-red-500">*</span>
            </label>
            <select
              value={shippingOption}
              onChange={(e) => setShippingOption(e.target.value as ShippingOption)}
              className="w-full border-2 border-gray-300 rounded-xl py-3 px-4 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500 transition-all"
              required
            >
              <option value="both">Collection or Delivery</option>
              <option value="collection">Collection Only</option>
              <option value="delivery">Delivery Only</option>
            </select>
          </div>
        </div>

        {/* Returns Policy */}
        <div className="p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={acceptsReturns}
              onChange={(e) => setAcceptsReturns(e.target.checked)}
              className="mt-1 h-5 w-5 rounded border-gray-300 text-gold-500 focus:ring-2 focus:ring-gold-500"
            />
            <div className="flex-1">
              <span className="font-semibold text-gray-900">Accept Returns</span>
              <p className="text-sm text-gray-600 mt-1">Allow buyers to return within a specified period</p>
            </div>
          </label>

          {acceptsReturns && (
            <div className="mt-4 ml-8">
              <label className="block text-sm font-semibold text-gray-900 mb-2">Return Window</label>
              <select
                value={returnDays}
                onChange={(e) => setReturnDays(Number(e.target.value))}
                className="w-48 border-2 border-gray-300 rounded-xl py-2 px-3 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500 transition-all"
              >
                <option value={7}>7 days</option>
                <option value={14}>14 days</option>
                <option value={30}>30 days</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="border-2 border-red-300 bg-red-50 text-red-800 rounded-2xl p-4 font-medium">
          ⚠️ {error}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <button
          type="submit"
          disabled={!canSave || saving}
          className={`flex-1 sm:flex-none px-6 py-3.5 rounded-xl font-bold text-lg transition-all ${
            !canSave || saving
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : "bg-gradient-to-r from-gold-500 to-yellow-500 hover:from-gold-600 hover:to-yellow-600 text-white shadow-lg hover:shadow-xl"
          }`}
        >
          {saving ? "Saving..." : "Save & Publish"}
        </button>

        <button
          type="button"
          onClick={handleSaveAsDraft}
          disabled={saving}
          className="flex-1 sm:flex-none px-6 py-3.5 rounded-xl font-semibold border-2 border-gray-300 text-gray-800 hover:bg-gray-50 disabled:opacity-50 transition-all"
        >
          Save as Draft
        </button>

        <button
          type="button"
          onClick={handleMarkAsSold}
          disabled={saving}
          className="flex-1 sm:flex-none px-6 py-3.5 rounded-xl font-semibold border-2 border-green-300 bg-green-50 text-green-900 hover:bg-green-100 disabled:opacity-50 transition-all"
        >
          Mark as Sold
        </button>

        <button
          type="button"
          onClick={onCancel}
          className="flex-1 sm:flex-none px-6 py-3.5 rounded-xl font-semibold border-2 border-gray-300 text-gray-800 hover:bg-gray-50 transition-all"
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="flex-1 sm:flex-none px-6 py-3.5 rounded-xl font-semibold border-2 border-red-300 bg-red-50 text-red-900 hover:bg-red-100 disabled:opacity-50 transition-all"
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
