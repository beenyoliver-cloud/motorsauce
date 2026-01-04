// src/components/MyGarageCard.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { isMe } from "@/lib/auth";
import {
  Car as CarType,
  loadMyCars, saveMyCars,
  getSelectedCarId, setSelectedCarId,
  isPublic, setPublic,
  readPublicGarage,
  vehicleLabel,
  fallbackCarImage,
  loadGarageFromDatabase,
} from "@/lib/garage";
import { VEHICLES, YEARS } from "@/data/vehicles";
import {
  Trash2, Plus, Eye, EyeOff, Star, Image as ImageIcon, PencilLine, Check, X, Link as LinkIcon, Copy
} from "lucide-react";
import DisplayWall from "@/components/DisplayWall";
import GarageStats from "@/components/GarageStats";
import EnhancedVehicleForm from "@/components/EnhancedVehicleForm";
import GaragePartsIntegration from "@/components/GaragePartsIntegration";
import GarageQRCode from "@/components/GarageQRCode";
import { scheduleVehicleReminders } from "@/lib/reminderScheduler";

/* ----------------------------- Small helpers ----------------------------- */
function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

async function readImageFile(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file.");
  if (file.size > 12 * 1024 * 1024) throw new Error("Image larger than 12MB. Please choose a smaller image (<12MB).");
  const buf = await file.arrayBuffer();
  const blob = new Blob([new Uint8Array(buf)], { type: file.type });
  return await new Promise<string>((resolve, reject) => {
    const fr = new FileReader();
    fr.onerror = () => reject(new Error("Could not read the file."));
    fr.onload = () => resolve(String(fr.result || ""));
    fr.readAsDataURL(blob);
  });
}

function buildSearchUrl(c: Pick<CarType, "make" | "model" | "year">) {
  const params = new URLSearchParams();
  if (c.make) params.set("make", c.make);
  if (c.model) params.set("model", c.model);
  if (c.year) {
    params.set("yearFrom", String(c.year));
    params.set("yearTo", String(c.year));
  }
  return `/search?${params.toString()}`;
}

/* Thumbnail (card) */
function CarThumb({ src, alt }: { src?: string; alt: string }) {
  const [img, setImg] = useState<string>(src || fallbackCarImage());
  useEffect(() => setImg(src || fallbackCarImage()), [src]);
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={img} alt={alt} className="site-image" onError={() => setImg(fallbackCarImage())} />;
}

/* Cover image (default card) */
function CarCover({ src, alt, parallaxY = 0 }: { src?: string; alt: string; parallaxY?: number }) {
  const [img, setImg] = useState<string>(src || fallbackCarImage());
  useEffect(() => setImg(src || fallbackCarImage()), [src]);
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={img}
      alt={alt}
      className="w-full h-48 sm:h-56 md:h-64 object-cover will-change-transform"
      style={{ transform: `translateY(${parallaxY}px)` }}
      onError={() => setImg(fallbackCarImage())}
    />
  );
}

/* Accessible toggle */
function Toggle({
  checked,
  onChange,
  onLabel = "Public",
  offLabel = "Private",
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  onLabel?: string;
  offLabel?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cx(
        "inline-flex items-center gap-1.5 rounded-lg px-2 h-8 border transition focus:outline-none focus:ring-2 focus:ring-yellow-400",
        checked
          ? "bg-green-50 border-green-200 text-green-700"
          : "bg-gray-50 border-gray-200 text-gray-600"
      )}
      title={checked ? onLabel : offLabel}
    >
      <EyeOff className={cx("h-4 w-4 transition-opacity", checked ? "opacity-0" : "opacity-100")} />
      <span className="text-sm font-semibold select-none">{checked ? onLabel : offLabel}</span>
      <Eye className={cx("h-4 w-4 transition-opacity", checked ? "opacity-100" : "opacity-0")} />
    </button>
  );
}

/* ----------------------------- Main component ---------------------------- */
export default function MyGarageCard({ displayName }: { displayName: string }) {
  const [mine, setMine] = useState(false);

  useEffect(() => {
    isMe(displayName).then(setMine);
  }, [displayName]);

  // owner state
  const [cars, setCars] = useState<CarType[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pub, setPubState] = useState(false);

  // viewer state
  const [publicView, setPublicView] = useState<{ cars: CarType[]; selected?: string | null } | null>(null);

  // tabs
  const [activeTab, setActiveTab] = useState<"garage" | "display-wall">("garage");

  // add vehicle
  const [openAdd, setOpenAdd] = useState(false);
  const [make, setMake] = useState<string>("");
  const [model, setModel] = useState<string>("");
  const [year, setYear] = useState<string>("");
  const [newImage, setNewImage] = useState<string | undefined>(undefined);
  const [formErr, setFormErr] = useState<string | null>(null);
  const uploadRef = useRef<HTMLInputElement | null>(null);

  // edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editMake, setEditMake] = useState("");
  const [editModel, setEditModel] = useState("");
  const [editYear, setEditYear] = useState("");

  // misc
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // animation flags
  const [justChangedId, setJustChangedId] = useState<string | null>(null);
  const [coverAnimate, setCoverAnimate] = useState(false);

  // parallax
  const coverRef = useRef<HTMLDivElement | null>(null);
  const [parallaxY, setParallaxY] = useState(0);
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    if (mine) {
      // Load from localStorage first (this is the source of truth for the current session)
      const localCars = loadMyCars();
      setCars(localCars);
      setSelectedId(getSelectedCarId());
      setPubState(isPublic());
      
      // For logged-in users, only load from database if localStorage is empty
      // This preserves local changes even if user logs out and back in
      if (localCars.length === 0) {
        loadGarageFromDatabase().then((dbCars) => {
          if (dbCars && dbCars.length > 0) {
            setCars(dbCars);
          }
        });
      }
      
      const onGarage = () => {
        setCars(loadMyCars());
        setSelectedId(getSelectedCarId());
        setPubState(isPublic());
      };
      window.addEventListener("ms:garage", onGarage as EventListener);
      return () => window.removeEventListener("ms:garage", onGarage as EventListener);
    } else {
      // Fetch public garage data asynchronously
      readPublicGarage(displayName).then(setPublicView);
      const onStorage = () => {
        readPublicGarage(displayName).then(setPublicView);
      };
      window.addEventListener("storage", onStorage);
      return () => window.removeEventListener("storage", onStorage);
    }
  }, [mine, displayName]);

  const list = mine ? cars : publicView?.cars || [];
  const defaultCar = useMemo(
    () => (mine ? list.find((c) => c.id === selectedId) : list.find((c) => c.id === (publicView?.selected || null))),
    [mine, list, selectedId, publicView]
  );
  const others = useMemo(() => list.filter((c) => c.id !== defaultCar?.id), [list, defaultCar]);

  /* ----------------------------- Actions ----------------------------- */
  function makeDefault(id: string) {
    setSelectedCarId(id);
    setSelectedId(id);
    setJustChangedId(id);         // ripple on the card just promoted
    setCoverAnimate(true);        // animate the cover
    setTimeout(() => setJustChangedId(null), 900);
    setTimeout(() => setCoverAnimate(false), 650);
  }

  async function copyLabel(id: string, label: string) {
    try {
      await navigator.clipboard.writeText(label);
      setCopiedId(id);
      setTimeout(() => setCopiedId((prev) => (prev === id ? null : prev)), 1200);
    } catch {}
  }

  function startEdit(c: CarType) {
    setEditingId(c.id);
    setEditMake(c.make);
    setEditModel(c.model);
    setEditYear(c.year);
  }

  function cancelEdit() {
    setEditingId(null);
  }

  function saveEdit(id: string) {
    if (!editMake || !editModel || !editYear) return;
    const next = cars.map((c) =>
      c.id === id ? { ...c, make: editMake, model: editModel, year: editYear } : c
    );
    saveMyCars(next);
    setCars(next);
    setEditingId(null);
  }

  async function changeCarPhoto(id: string, file?: File) {
    if (!file) return;
    try {
      const dataUrl = await readImageFile(file);
      const next = cars.map((c) => (c.id === id ? { ...c, image: dataUrl } : c));
      saveMyCars(next);
      setCars(next);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Unable to use that image.");
    }
  }

  function removeCarPhoto(id: string) {
    const next = cars.map((c) => (c.id === id ? { ...c, image: undefined } : c));
    saveMyCars(next);
    setCars(next);
  }

  function removeCar(id: string) {
    const next = cars.filter((c) => c.id !== id);
    saveMyCars(next);
    setCars(next);
    if (selectedId === id) {
      const fallback = next[0]?.id || null;
      setSelectedCarId(fallback);
      setSelectedId(fallback);
    }
  }

  function togglePublic() {
    setPublic(!pub);
    setPubState(!pub);
  }

  // Shared save handler to avoid duplicate inserts and ensure first car selection
  async function onSave(vehicle: CarType) {
    const newCar: CarType = {
      id: vehicle.id || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      make: vehicle.make!,
      model: vehicle.model!,
      year: vehicle.year!,
      trim: vehicle.trim,
      color: vehicle.color,
      registration: vehicle.registration,
      hideRegistration: vehicle.hideRegistration || false,
      mileage: vehicle.mileage,
      motExpiry: vehicle.motExpiry,
      motReminder: vehicle.motReminder || false,
      insuranceExpiry: vehicle.insuranceExpiry,
      insuranceReminder: vehicle.insuranceReminder || false,
      notes: vehicle.notes,
      image: vehicle.image,
      photos: [],
    };

    setCars((prev) => {
      if (prev.some((c) => c.id === newCar.id)) return prev;
      const next = [...prev, newCar];
      saveMyCars(next);
      if (prev.length === 0) {
        setSelectedCarId(newCar.id);
        setSelectedId(newCar.id);
      }
      return next;
    });

    await scheduleVehicleReminders(displayName, newCar.id, {
      mot: {
        enabled: newCar.motReminder || false,
        expiryDate: newCar.motExpiry,
      },
      insurance: {
        enabled: newCar.insuranceReminder || false,
        expiryDate: newCar.insuranceExpiry,
      },
    });
  }

  /* ----------------------------- Add vehicle ----------------------------- */
  async function onAddImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const dataUrl = await readImageFile(file);
      setNewImage(dataUrl);
      setFormErr(null);
    } catch (err) {
      setFormErr(err instanceof Error ? err.message : "Unable to use that image.");
    }
  }

  function addCar(e: React.FormEvent) {
    e.preventDefault();
    setFormErr(null);
    const mk = make.trim();
    const md = model.trim();
    const yr = year.trim();
    if (!mk || !md || !yr) {
      setFormErr("Please select make, model, and year.");
      return;
    }
    const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    const newCar: CarType = { id, make: mk, model: md, year: yr, image: newImage };
    setCars((prev) => {
      if (prev.some((c) => c.id === id)) return prev;
      const next = [newCar, ...prev];
      saveMyCars(next);
      return next;
    });

    // reset
    setMake("");
    setModel("");
    setYear("");
    setNewImage(undefined);
    setOpenAdd(false);

    if (!selectedId) {
      setSelectedCarId(id);
      setSelectedId(id);
    }
  }

  const modelOptions = useMemo(() => (make ? VEHICLES[make] || [] : []), [make]);

  /* ----------------------------- Parallax ----------------------------- */
  useEffect(() => {
    // disable parallax on very small screens or when compact view enabled
    if (compact) return;
    if (typeof window !== 'undefined' && window.innerWidth < 640) return;
    function onScroll() {
      const el = coverRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      if (rect.bottom < 0 || rect.top > vh) return;
      const centerOffset = (rect.top + rect.height / 2) - vh / 2;
      const ratio = centerOffset / vh;
      const offset = Math.max(-20, Math.min(20, -ratio * 24));
      setParallaxY(offset);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [compact]);

  /* -------------------------------- Render -------------------------------- */

  const canShow = mine ? true : !!publicView;

  if (!canShow) {
    return (
      <div className="rounded-sm border border-gray-200 bg-white p-6">
        <h2 className="text-xl font-bold text-black">Garage</h2>
        <p className="mt-1 text-gray-700">This user's garage is private.</p>
      </div>
    );
  }

  return (
    <div className="rounded-sm border border-gray-200 bg-white overflow-hidden">
      {/* Header */}
      <div className="px-4 sm:px-6 pt-4 pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Title + default badge */}
          <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-xl font-bold text-black tracking-tight">
            {mine ? "My Garage" : `${displayName}'s Garage`}
          </h2>
          {defaultCar && (
            <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full bg-yellow-500 text-black">
              {vehicleLabel(defaultCar)}
            </span>
          )}
          </div>

          {/* Actions - stack on mobile */}
          <div className="flex items-center gap-2 flex-wrap">
            {mine && (
              <>
                <button
                  type="button"
                  onClick={() => setOpenAdd((v) => !v)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-yellow-500 text-black font-semibold text-sm px-3 py-1.5 hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                >
                  <Plus className="h-3.5 w-3.5" /> Add
                </button>
                <button
                  type="button"
                  onClick={() => setCompact((v) => !v)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white text-gray-900 text-sm px-3 py-1.5 hover:bg-gray-50 transition"
                >
                  {compact ? "Grid" : "List"}
                </button>
                <Toggle checked={pub} onChange={togglePublic} />
                {pub && (
                  <div className="inline-flex items-center gap-2">
                    <GarageQRCode username={displayName} vehicleCount={cars.length} />
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const url = `${window.location.origin}/profile/${encodeURIComponent(displayName)}#garage`;
                          await navigator.clipboard.writeText(url);
                          setCopiedId("__public__");
                          setTimeout(() => setCopiedId((prev) => (prev === "__public__" ? null : prev)), 1200);
                        } catch {}
                      }}
                      className={cx(
                        "inline-flex items-center gap-1 rounded-md border text-sm px-3 py-1.5",
                        copiedId === "__public__"
                          ? "bg-white border-green-300 text-green-700"
                          : "bg-white border-gray-200 text-gray-900 hover:bg-gray-50"
                      )}
                      title="Copy public garage link"
                    >
                      <LinkIcon className="h-4 w-4" />
                      {copiedId === "__public__" ? "Link copied" : "Copy public link"}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Default car as a cover card */}
      {defaultCar && (
        <div className={cx("mt-4 relative", coverAnimate && "ms-pop")} ref={coverRef}>
          <div className={cx("relative", coverAnimate && "ms-glow-ring")}>
            <CarCover src={defaultCar.image} alt={vehicleLabel(defaultCar)} parallaxY={parallaxY} />
            {/* Subtle gradient for text legibility */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-black/10 to-transparent" />

            {/* Top-right actions */}
            {mine && (
              <div className="absolute top-3 right-3 flex gap-2">
                <label
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white text-gray-900 text-sm px-3 py-1.5 shadow hover:bg-gray-100 cursor-pointer focus-within:ring-2 focus-within:ring-yellow-400 transition"
                  title="Photo"
                >
                  <ImageIcon className="h-3.5 w-3.5" />
                  Photo
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) => changeCarPhoto(defaultCar.id, e.target.files?.[0])}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => startEdit(defaultCar)}
                  className="inline-flex items-center gap-1 rounded-lg bg-yellow-500 text-black font-semibold px-3 py-1.5 text-sm shadow hover:bg-yellow-600 transition"
                  title="Edit"
                >
                  <PencilLine className="h-3.5 w-3.5" />
                  Edit
                </button>
              </div>
            )}

            {/* Bottom content */}
            <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-white font-semibold text-lg sm:text-xl truncate drop-shadow">
                      {vehicleLabel(defaultCar)}
                    </h3>
                    <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-yellow-500 text-black text-[11px] font-bold px-2 py-[2px] drop-shadow">
                      DEFAULT
                    </span>
                  </div>
                  <p className="text-white/90 text-sm drop-shadow">
                    {defaultCar.make} {defaultCar.model} • {defaultCar.year}
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  <a
                    href={buildSearchUrl(defaultCar)}
                    className="inline-flex items-center gap-1 rounded-lg bg-white text-gray-900 text-sm px-3 py-1.5 shadow hover:bg-gray-50 transition"
                    title="Find parts for this vehicle"
                  >
                    <LinkIcon className="h-3.5 w-3.5" /> Parts
                  </a>
                  <button
                    type="button"
                    onClick={() => copyLabel(defaultCar.id, vehicleLabel(defaultCar))}
                    className={cx(
                      "inline-flex items-center gap-1 rounded-lg text-sm px-3 py-1.5 border shadow transition",
                      copiedId === defaultCar.id
                        ? "bg-white border-green-300 text-green-700"
                        : "bg-white border-gray-200 text-gray-900 hover:bg-gray-50"
                    )}
                    title="Copy vehicle label"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    {copiedId === defaultCar.id ? "✓" : "Copy"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Inline editing row for default car (below cover) */}
          {editingId === defaultCar.id && (
            <div className="px-6 py-4 border-t border-gray-200 bg-white">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  value={editMake}
                  onChange={(e) => setEditMake(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  placeholder="Make"
                />
                <input
                  value={editModel}
                  onChange={(e) => setEditModel(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  placeholder="Model"
                />
                <input
                  value={editYear}
                  onChange={(e) => setEditYear(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  placeholder="Year"
                />
              </div>
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => saveEdit(defaultCar.id)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-yellow-500 text-black font-semibold px-3 py-1.5 text-sm hover:bg-yellow-600 transition"
                >
                  <Check className="h-3.5 w-3.5" /> Save
                </button>
                <button
                  onClick={cancelEdit}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white text-gray-900 px-3 py-1.5 text-sm hover:bg-gray-50 transition"
                >
                  <X className="h-3.5 w-3.5" /> Cancel
                </button>
                {mine && (
                  <>
                    <label className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white text-gray-900 px-3 py-1.5 text-sm hover:bg-gray-50 cursor-pointer transition">
                      <ImageIcon className="h-3.5 w-3.5" />
                      Photo
                      <input
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={(e) => changeCarPhoto(defaultCar.id, e.target.files?.[0])}
                      />
                    </label>
                    {defaultCar.image && (
                      <button
                        onClick={() => removeCarPhoto(defaultCar.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white text-gray-900 px-3 py-1.5 text-sm hover:bg-gray-50 transition"
                      >
                        <X className="h-3.5 w-3.5" /> Remove
                      </button>
                    )}
                    <button
                      onClick={() => {
                        const ok = window.confirm("Delete this vehicle?");
                        if (ok) removeCar(defaultCar.id);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg text-red-700 border border-red-200 bg-white px-3 py-1.5 text-sm hover:bg-red-50 transition"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="border-t border-gray-200">
        <div className="px-6">
          <div className="flex gap-1 -mb-px">
            <button
              onClick={() => setActiveTab("garage")}
              className={cx(
                "px-4 py-3 text-sm font-semibold border-b-2 transition-colors",
                activeTab === "garage"
                  ? "border-yellow-500 text-gray-900"
                  : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
              )}
            >
              Garage
            </button>
            <button
              onClick={() => setActiveTab("display-wall")}
              className={cx(
                "px-4 py-3 text-sm font-semibold border-b-2 transition-colors",
                activeTab === "display-wall"
                  ? "border-yellow-500 text-gray-900"
                  : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
              )}
            >
              Display Wall
            </button>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "garage" && (
        <>
          {/* Stats for default car */}
          {defaultCar && (
            <div className="px-6 py-5 border-b border-gray-200">
              <GarageStats car={defaultCar} />
            </div>
          )}
          
          {/* Parts Integration for default car */}
          {mine && defaultCar && (
            <div className="px-6 py-5 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Compatible Parts</h3>
              <GaragePartsIntegration car={defaultCar} />
            </div>
          )}
          
          {/* Other cars will be rendered below */}
        </>
      )}

      {activeTab === "display-wall" && (
        <div className="px-6 py-6">
          <DisplayWall cars={cars} />
        </div>
      )}

      {/* Add vehicle panel */}
      {mine && openAdd && (
        <div className="px-6 py-5 border-t border-gray-200 bg-gray-50/60">
          <EnhancedVehicleForm
            onSubmit={async (vehicle) => {
              await onSave(vehicle as CarType);
              setOpenAdd(false);
              setFormErr(null);
            }}
            onCancel={() => {
              setOpenAdd(false);
              setFormErr(null);
            }}
            vehicleMakes={VEHICLES}
            years={YEARS}
          />
          {formErr && (
            <div className="mt-3 text-xs rounded-md border border-red-200 bg-red-50 text-red-800 px-3 py-2">
              {formErr}
            </div>
          )}
        </div>
      )}

  {/* Other cars grid - only show in Garage tab */}
  {activeTab === "garage" && (
    <div className="px-6 py-6">
        {list.length === 0 && !mine && (
          <div className="rounded-xl border border-dashed border-gray-300 p-10 text-center">
            <div className="mx-auto h-16 w-24 rounded-md bg-gray-100 flex items-center justify-center mb-3">
              <ImageIcon className="h-6 w-6 text-gray-400" />
            </div>
            <div className="text-gray-800 font-medium">No vehicles shared</div>
            <div className="text-gray-600 text-sm mt-1">
              This user hasn’t added any vehicles to their public garage.
            </div>
          </div>
        )}

        {list.length === 0 && mine && !openAdd && (
          <div className="rounded-xl border border-dashed border-gray-300 p-10 text-center">
            <div className="mx-auto h-16 w-24 rounded-md bg-gray-100 flex items-center justify-center mb-3">
              <ImageIcon className="h-6 w-6 text-gray-400" />
            </div>
            <div className="text-gray-800 font-medium">No vehicles yet</div>
            <div className="text-gray-600 text-sm mt-1">
              Add your car to tailor search results and compatibility.
            </div>
            <button
              type="button"
              onClick={() => setOpenAdd(true)}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-yellow-500 text-black font-semibold text-sm px-3 py-1.5 hover:bg-yellow-600"
            >
              <Plus className="h-3.5 w-3.5" /> Add vehicle
            </button>
          </div>
        )}

        {others.length > 0 && !compact && (
          <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {others.map((c) => {
              const label = vehicleLabel(c);
              const isEditing = editingId === c.id;
              const searchUrl = buildSearchUrl(c);
              const inputId = `carfile-${c.id}`;
              const justChanged = justChangedId === c.id;

              return (
                <li
                  key={c.id}
                  className={cx(
                    "rounded-lg bg-white overflow-hidden hover:opacity-80 transition",
                    justChanged && "ms-card-ring"
                  )}
                >
                  <div className="group relative">
                    {/* Square thumbnail */}
                    <div className="relative w-full aspect-square bg-gray-100 overflow-hidden">
                      <CarThumb src={c.image} alt={label} />
                      {mine && (
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <button
                            onClick={() => makeDefault(c.id)}
                            className="inline-flex items-center gap-1 rounded-md bg-white text-gray-900 text-xs font-semibold px-2.5 py-1.5 shadow-lg hover:bg-yellow-500 transition"
                          >
                            <Star className="h-3 w-3" /> Default
                          </button>
                        </div>
                      )}
                    </div>

                    {!isEditing ? (
                      <div className="p-2">
                        <div className="text-xs font-semibold text-gray-900 truncate">{label}</div>
                        <div className="text-[11px] text-gray-500 truncate">{c.year}</div>
                      </div>
                    ) : (
                      <div className="p-2 space-y-2">
                        <input
                          value={editMake}
                          onChange={(e) => setEditMake(e.target.value)}
                          className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-yellow-400"
                          placeholder="Make"
                        />
                        <input
                          value={editModel}
                          onChange={(e) => setEditModel(e.target.value)}
                          className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-yellow-400"
                          placeholder="Model"
                        />
                        <input
                          value={editYear}
                          onChange={(e) => setEditYear(e.target.value)}
                          className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-yellow-400"
                          placeholder="Year"
                        />
                        <div className="flex gap-1">
                          <button
                            onClick={() => saveEdit(c.id)}
                            className="flex-1 inline-flex items-center justify-center gap-1 text-[10px] px-2 py-1.5 rounded-md bg-green-500 text-white font-semibold hover:bg-green-600"
                          >
                            <Check className="h-3 w-3" /> Save
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="flex-1 inline-flex items-center justify-center gap-1 text-[10px] px-2 py-1.5 rounded-md border border-gray-300 bg-white text-gray-900 hover:bg-gray-50"
                          >
                            <X className="h-3 w-3" /> Cancel
                          </button>
                        </div>
                        {mine && (
                          <button
                            onClick={() => {
                              const ok = window.confirm("Delete this vehicle?");
                              if (ok) removeCar(c.id);
                            }}
                            className="w-full inline-flex items-center justify-center gap-1 text-[10px] px-2 py-1.5 rounded-md text-red-700 border border-red-200 bg-white hover:bg-red-50"
                          >
                            <Trash2 className="h-3 w-3" /> Delete
                          </button>
                        )}
                      </div>
                    )}

                    {mine && !isEditing && (
                      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                        <button
                          onClick={() => startEdit(c)}
                          className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white/90 text-gray-700 hover:bg-white shadow-sm"
                          title="Edit"
                        >
                          <PencilLine className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {others.length > 0 && compact && (
          <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
            <thead className="bg-gray-50 text-gray-700">
              <tr className="text-left">
                <th className="py-2 px-3 font-medium">Vehicle</th>
                <th className="py-2 px-3 font-medium">Year</th>
                <th className="py-2 px-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {others.map(c => {
                const label = vehicleLabel(c);
                return (
                  <tr key={c.id} className="border-t border-gray-200">
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="h-10 w-16 rounded-md bg-gray-100 overflow-hidden shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={c.image || fallbackCarImage()} alt={label} className="site-image" loading="lazy" />
                        </div>
                        <span className="font-semibold text-gray-900 truncate">{label}</span>
                      </div>
                    </td>
                    <td className="py-2 px-3 text-gray-700">{c.year}</td>
                    <td className="py-2 px-3">
                      <div className="flex flex-wrap gap-1">
                        {mine && (
                          <button
                            type="button"
                            onClick={() => makeDefault(c.id)}
                            className="text-[11px] px-2 py-1 rounded border border-gray-300 bg-white hover:bg-gray-50"
                          >Default</button>
                        )}
                        <a href={buildSearchUrl(c)} className="text-[11px] px-2 py-1 rounded border border-gray-300 bg-white hover:bg-gray-50">Parts</a>
                        <button
                          type="button"
                          onClick={() => copyLabel(c.id, label)}
                          className={`text-[11px] px-2 py-1 rounded border ${copiedId === c.id ? 'border-green-300 bg-white text-green-700' : 'border-gray-300 bg-white hover:bg-gray-50'}`}
                        >{copiedId === c.id ? 'Copied' : 'Copy'}</button>
                        {mine && (
                          <button
                            type="button"
                            onClick={() => startEdit(c)}
                            className="text-[11px] px-2 py-1 rounded border border-yellow-500 bg-yellow-500 text-black hover:bg-yellow-600"
                          >Edit</button>
                        )}
                        {mine && (
                          <button
                            type="button"
                            onClick={() => { const ok = window.confirm('Delete this vehicle?'); if (ok) removeCar(c.id); }}
                            className="text-[11px] px-2 py-1 rounded border border-red-300 bg-white text-red-700 hover:bg-red-50"
                          >Del</button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
    </div>
  )}

      {/* Motorsauce-themed animations */}
      <style jsx>{`
        @keyframes msPop {
          0% { transform: scale(0.985); opacity: 0.4; }
          60% { transform: scale(1.02); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        .ms-pop { animation: msPop 600ms cubic-bezier(.2,.8,.2,1); }

        /* Yellow ripple ring (subtle, professional) */
        @keyframes msGlowRing {
          0% { box-shadow: 0 0 0 0 rgba(234,179,8,0.55); }
          100% { box-shadow: 0 0 0 24px rgba(234,179,8,0); }
        }
        .ms-glow-ring { animation: msGlowRing 650ms ease-out; border-radius: 12px; }

        /* Small card ring when it just became default */
        @keyframes msCardRing {
          0% { box-shadow: 0 0 0 0 rgba(234,179,8,0.55); }
          100% { box-shadow: 0 0 0 14px rgba(234,179,8,0); }
        }
        .ms-card-ring { animation: msCardRing 900ms ease-out; }
      `}</style>
    </div>
  );
}
