"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Upload, X, HelpCircle } from "lucide-react";
import { useRouter } from "next/navigation";

type Category = "OEM" | "Aftermarket" | "Tool" | "";
type Condition = "New" | "Used - Like New" | "Used - Good" | "Used - Fair";

type Img = { id: string; file: File; url: string };

const MAKES = [
  "Vauxhall","Volkswagen","Audi","BMW","Ford","Mercedes-Benz","Toyota","Honda",
  "Nissan","Peugeot","Renault","Škoda","SEAT","Mazda","MINI","Volvo","Kia","Hyundai"
];

export default function SellPage() {
  const router = useRouter();

  // ---- Form state ----
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<Category>("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [genCode, setGenCode] = useState("");
  const [engine, setEngine] = useState("");
  const [yearFrom, setYearFrom] = useState<number | undefined>();
  const [yearTo, setYearTo] = useState<number | undefined>();
  const [oem, setOem] = useState("");
  const [vin, setVin] = useState("");
  const [condition, setCondition] = useState<Condition>("Used - Good");
  const [price, setPrice] = useState<string>("");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<Img[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const dropRef = useRef<HTMLLabelElement>(null);

  // ---- Step 3: ensure a local identity (owner) ----
  useEffect(() => {
    let uid = localStorage.getItem("ms_user_id");
    let uname = localStorage.getItem("ms_user_name");
    if (!uid) {
      uid = `user_${crypto.randomUUID()}`;
      localStorage.setItem("ms_user_id", uid);
    }
    if (!uname) {
      uname = "You";
      localStorage.setItem("ms_user_name", uname);
    }
  }, []);

  // ---- Derived ----
  const isVehicleSpecific = category !== "Tool" && category !== "";
  const canSubmit = useMemo(() => {
    if (!title.trim()) return false;
    if (!category) return false;
    if (!price || Number.isNaN(Number(price))) return false;
    if (images.length === 0) return false; // require at least one image
    if (isVehicleSpecific && !make.trim() && !model.trim() && !oem.trim()) return false;
    return true;
  }, [title, category, price, images.length, isVehicleSpecific, make, model, oem]);

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
      setErrorMsg("Please fill in required fields and add at least one photo.");
      return;
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("title", title.trim());
      fd.append("category", category);
      fd.append("make", make.trim());
      fd.append("model", model.trim());
      fd.append("genCode", genCode.trim());
      fd.append("engine", engine.trim());
      if (yearFrom) fd.append("yearFrom", String(yearFrom));
      if (yearTo) fd.append("yearTo", String(yearTo));
      fd.append("oem", oem.trim());
      fd.append("vin", vin.trim());
      fd.append("condition", condition);
      fd.append("price", price.trim());
      fd.append("description", description.trim());
      images.forEach((img) => fd.append("images", img.file, img.file.name));

      // ---- Step 3: include ownerId + sellerName in POST ----
      const ownerId = localStorage.getItem("ms_user_id") || "";
      const sellerName = localStorage.getItem("ms_user_name") || "You";
      fd.append("ownerId", ownerId);
      fd.append("sellerName", sellerName);

      const res = await fetch("/api/listings", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to create listing");

      setSubmitted(true);
      router.push(`/listing/${data.id}`);
    } catch (err: any) {
      setErrorMsg(err?.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // ---- Render ----
  return (
    <section className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-black mb-6">Sell a Part</h1>

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
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 placeholder-gray-450 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              required
            />
            <p className="mt-1 text-xs text-gray-600">Clear & specific titles sell faster.</p>
          </div>

          {/* Category */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
            <select
              name="category"
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              required
            >
              <option value="">Select a category</option>
              <option value="OEM">OEM</option>
              <option value="Aftermarket">Aftermarket</option>
              <option value="Tool">Tool / Accessory</option>
            </select>
          </div>

          {/* Fitment */}
          <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${isVehicleSpecific ? "" : "opacity-60"}`}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Make {isVehicleSpecific ? "(recommended)" : "(optional)"}
              </label>
              <input
                type="text"
                name="make"
                list="makes"
                value={make}
                onChange={(e) => setMake(e.target.value)}
                placeholder="e.g., Vauxhall"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 placeholder-gray-450 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                disabled={!isVehicleSpecific}
              />
              <datalist id="makes">
                {MAKES.map((m) => <option key={m} value={m} />)}
              </datalist>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Model {isVehicleSpecific ? "(recommended)" : "(optional)"}
              </label>
              <input
                type="text"
                name="model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="e.g., Astra"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 placeholder-gray-450 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                disabled={!isVehicleSpecific}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Generation</label>
              <input
                type="text"
                name="genCode"
                value={genCode}
                onChange={(e) => setGenCode(e.target.value)}
                placeholder="e.g., J / Mk7 / 8V"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 placeholder-gray-450 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                disabled={!isVehicleSpecific}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Engine</label>
              <input
                type="text"
                name="engine"
                value={engine}
                onChange={(e) => setEngine(e.target.value)}
                placeholder="e.g., 1.4T / 2.0 TDI"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 placeholder-gray-450 focus:outline-none focus:ring-2 focus:ring-yellow-400"
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
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 placeholder-gray-450 focus:outline-none focus:ring-2 focus:ring-yellow-400"
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
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 placeholder-gray-450 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                disabled={!isVehicleSpecific}
              />
            </div>
          </div>

          {/* OEM / VIN */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
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
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 placeholder-gray-450 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
            </div>
            <div>
              <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">
                VIN (optional) <HelpCircle className="h-4 w-4 text-gray-400" />
              </label>
              <input
                type="text"
                name="vin"
                value={vin}
                onChange={(e) => setVin(e.target.value)}
                placeholder="e.g., W0Lxxxxxx..."
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 placeholder-gray-450 focus:outline-none focus:ring-2 focus:ring-yellow-400"
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
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-400"
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
                  className="w-full border border-gray-300 rounded-md pl-7 pr-3 py-2 text-gray-900 placeholder-gray-450 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  required
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              name="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add any useful details: mileage, wear, defects, what's included, shipping/collection…"
              className="w-full min-h-[120px] border border-gray-300 rounded-md px-3 py-2 text-gray-900 placeholder-gray-450 focus:outline-none focus:ring-2 focus:ring-yellow-400"
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
          <button
            type="button"
            onClick={() => {
              localStorage.setItem(
                "sell-draft",
                JSON.stringify({
                  title, category, make, model, genCode, engine, yearFrom, yearTo,
                  oem, vin, condition, price, description
                })
              );
            }}
            className="px-4 py-2 rounded-md border border-gray-300 bg-white text-gray-900 hover:bg-gray-100"
          >
            Save Draft (local)
          </button>
        </div>

        {/* Success message */}
        {submitted && (
          <div className="border border-green-200 bg-green-50 text-green-800 rounded-lg p-3">
            Your listing has been created. Redirecting…
          </div>
        )}
      </form>
    </section>
  );
}
