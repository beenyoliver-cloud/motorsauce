"use client";

import { useEffect, useState, useRef, FormEvent } from "react";
import { Check, X, Image as ImageIcon, Calendar, Gauge, Search } from "lucide-react";
import { Car } from "@/lib/garage";
import { nsKey } from "@/lib/auth";

interface EnhancedVehicleFormProps {
  onSubmit: (vehicle: Partial<Car>) => void;
  onCancel: () => void;
  initialData?: Partial<Car>;
  vehicleMakes: Record<string, string[]>;
  years: string[];
}

export default function EnhancedVehicleForm({
  onSubmit,
  onCancel,
  initialData,
  vehicleMakes,
  years,
}: EnhancedVehicleFormProps) {
  const [make, setMake] = useState(initialData?.make || "");
  const [model, setModel] = useState(initialData?.model || "");
  const [year, setYear] = useState(initialData?.year || "");
  const [trim, setTrim] = useState(initialData?.trim || "");
  const [color, setColor] = useState(initialData?.color || "");
  const [registration, setRegistration] = useState(initialData?.registration || "");
  const [hideRegistration, setHideRegistration] = useState(initialData?.hideRegistration || false);
  const [mileage, setMileage] = useState(initialData?.mileage?.toString() || "");
  const [motExpiry, setMotExpiry] = useState(initialData?.motExpiry || "");
  const [motReminder, setMotReminder] = useState(initialData?.motReminder || false);
  const [insuranceExpiry, setInsuranceExpiry] = useState(initialData?.insuranceExpiry || "");
  const [insuranceReminder, setInsuranceReminder] = useState(initialData?.insuranceReminder || false);
  const [notes, setNotes] = useState(initialData?.notes || "");
  const [image, setImage] = useState<string | undefined>(initialData?.image);
  const [lookupLoading, setLookupLoading] = useState(false);
  
  const uploadRef = useRef<HTMLInputElement>(null);

  // Canonicalize make/model to known options
  function canonicalMake(mk: string): string {
    const keys = Object.keys(vehicleMakes || {});
    const found = keys.find((k) => k.toLowerCase() === mk.toLowerCase());
    return found || mk;
  }
  function canonicalModel(mk: string, md: string): string {
    const list = (vehicleMakes?.[canonicalMake(mk)] || []) as string[];
    const found = list.find((m) => m.toLowerCase() === md.toLowerCase());
    return found || md;
  }

  // Prefill from last DVLA lookup (set by homepage plate search)
  useEffect(() => {
    try {
      const key = nsKey("last_dvla_lookup");
      const raw = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
      if (!raw) return;
      const v = JSON.parse(raw);
      if (!v || typeof v !== 'object') return;
      // Only prefill if fields are empty or initial
      const mk = v.make?.toString() || "";
      const md = v.model?.toString() || "";
      const yr = v.year ? String(v.year) : "";
      if (!make && mk) setMake(canonicalMake(mk));
      if (!model && md) setModel(canonicalModel(mk, md));
      if (!year && yr) setYear(yr);
      if (!trim && v.trim) setTrim(v.trim.toString());
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Lookup vehicle by registration plate
  const handleRegistrationLookup = async () => {
    if (!registration || registration.length < 2) {
      alert("Please enter a registration plate");
      return;
    }

    setLookupLoading(true);
    try {
      const res = await fetch(`/api/garage/registration-lookup?reg=${encodeURIComponent(registration)}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Vehicle not found");
      }

      // Auto-fill fields from DVLA data
      if (data.make) setMake(canonicalMake(data.make));
      if (data.model) setModel(canonicalModel(data.make, data.model));
      if (typeof data.year !== "undefined" && data.year !== null) setYear(String(data.year));
      if (data.trim) setTrim(data.trim);
      // Optional fields if provider supplies them
      if (data.color) setColor(data.color);
      if (data.motExpiry) setMotExpiry(data.motExpiry);
      
      alert("Vehicle details loaded successfully! Review and save.");
    } catch (err) {
      alert("Could not find vehicle. Please enter details manually.");
    } finally {
      setLookupLoading(false);
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    if (file.size > 12 * 1024 * 1024) {
      alert("Image must be under 12MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (!make || !model || !year) {
      alert("Please fill in make, model, and year");
      return;
    }

    onSubmit({
      ...initialData,
      make,
      model,
      year,
      trim: trim || undefined,
      color: color || undefined,
      registration: registration || undefined,
      hideRegistration,
      mileage: mileage ? parseInt(mileage, 10) : undefined,
      motExpiry: motExpiry || undefined,
      motReminder,
      insuranceExpiry: insuranceExpiry || undefined,
      insuranceReminder,
      notes: notes || undefined,
      image,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Quick Lookup by Registration */}
      <div className="p-4 rounded-lg border-2 border-yellow-200 bg-yellow-50">
        <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
          <Search className="h-4 w-4" />
          Quick Add by Registration Plate
        </h3>
        <p className="text-xs text-gray-600 mb-3">
          Enter your UK registration plate to auto-fill vehicle details including MOT expiry date.
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={registration}
            onChange={(e) => setRegistration(e.target.value.toUpperCase())}
            placeholder="AB12 CDE"
            className="flex-1 border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-900 font-mono uppercase focus:outline-none focus:ring-2 focus:ring-yellow-400"
          />
          <button
            type="button"
            onClick={handleRegistrationLookup}
            disabled={lookupLoading || !registration}
            className="px-4 py-2 rounded-md bg-yellow-500 text-black font-semibold hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {lookupLoading ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-black border-t-transparent rounded-full" />
                Looking up...
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                Lookup
              </>
            )}
          </button>
        </div>
      </div>

      {/* Basic Info */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Basic Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="grid gap-1">
            <span className="text-xs text-gray-700">Make *</span>
            <select
              value={make}
              onChange={(e) => {
                setMake(e.target.value);
                setModel("");
              }}
              className="border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              required
            >
              <option value="">Select make…</option>
              {Object.keys(vehicleMakes).map((mk) => (
                <option key={mk} value={mk}>{mk}</option>
              ))}
            </select>
          </label>

          <label className="grid gap-1">
            <span className="text-xs text-gray-700">Model *</span>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              disabled={!make}
              className="border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-400 disabled:bg-gray-100 disabled:text-gray-600"
              required
            >
              <option value="">Select model…</option>
              {(vehicleMakes[make] || []).map((md) => (
                <option key={md} value={md}>{md}</option>
              ))}
            </select>
          </label>

          <label className="grid gap-1">
            <span className="text-xs text-gray-700">Year *</span>
            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              required
            >
              <option value="">Select year…</option>
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </label>

          <label className="grid gap-1">
            <span className="text-xs text-gray-700">Trim/Variant</span>
            <input
              type="text"
              value={trim}
              onChange={(e) => setTrim(e.target.value)}
              placeholder="e.g. Sport, GT"
              className="border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </label>

          <label className="grid gap-1">
            <span className="text-xs text-gray-700">Color</span>
            <input
              type="text"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              placeholder="e.g. Black"
              className="border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </label>

          <label className="grid gap-1">
            <span className="text-xs text-gray-700">Mileage</span>
            <div className="relative">
              <Gauge className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="number"
                value={mileage}
                onChange={(e) => setMileage(e.target.value)}
                placeholder="50000"
                className="border border-gray-300 rounded-md pl-10 pr-3 py-2 w-full bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
            </div>
          </label>
        </div>
      </div>

      {/* Photo */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Photo</h3>
        <div className="flex items-start gap-4">
          <div className="h-32 w-48 rounded-lg bg-gray-100 border-2 border-dashed border-gray-300 overflow-hidden flex items-center justify-center">
            {image ? (
              <img src={image} alt="Vehicle" className="w-full h-full object-cover" />
            ) : (
              <ImageIcon className="h-8 w-8 text-gray-400" />
            )}
          </div>
          <div className="flex flex-col gap-2">
            <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 hover:bg-gray-50 cursor-pointer text-sm">
              <ImageIcon className="h-4 w-4" />
              {image ? "Change" : "Upload"} Photo
              <input ref={uploadRef} type="file" accept="image/*" hidden onChange={handleImageChange} />
            </label>
            {image && (
              <button
                type="button"
                onClick={() => setImage(undefined)}
                className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 hover:bg-gray-50 text-sm"
              >
                Remove
              </button>
            )}
            <p className="text-xs text-gray-600">Max 5MB • JPG, PNG</p>
          </div>
        </div>
      </div>

      {/* MOT & Insurance */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          MOT & Insurance
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="grid gap-1">
              <span className="text-xs text-gray-700">MOT Expiry Date</span>
              <input
                type="date"
                value={motExpiry}
                onChange={(e) => setMotExpiry(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={motReminder}
                onChange={(e) => setMotReminder(e.target.checked)}
                className="rounded border-gray-300 text-yellow-500 focus:ring-yellow-400"
              />
              Send me MOT reminders
            </label>
          </div>

          <div className="space-y-2">
            <label className="grid gap-1">
              <span className="text-xs text-gray-700">Insurance Expiry Date</span>
              <input
                type="date"
                value={insuranceExpiry}
                onChange={(e) => setInsuranceExpiry(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={insuranceReminder}
                onChange={(e) => setInsuranceReminder(e.target.checked)}
                className="rounded border-gray-300 text-yellow-500 focus:ring-yellow-400"
              />
              Send me insurance reminders
            </label>
          </div>
        </div>
      </div>

      {/* Advanced Settings removed per request */}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
        <button
          type="submit"
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-yellow-500 text-black font-semibold hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-400"
        >
          <Check className="h-4 w-4" />
          {initialData?.id ? "Update" : "Add"} Vehicle
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400"
        >
          <X className="h-4 w-4" />
          Cancel
        </button>
      </div>
    </form>
  );
}
