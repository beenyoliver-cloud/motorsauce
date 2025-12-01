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
} from "@/lib/garage";
import { VEHICLES, YEARS } from "@/data/vehicles";
import {
  Trash2, Plus, Eye, EyeOff, Star, Image as ImageIcon, PencilLine, Check, X, Link as LinkIcon, Copy
} from "lucide-react";
import DisplayWall from "@/components/DisplayWall";
import GarageStats from "@/components/GarageStats";
import EnhancedVehicleForm from "@/components/EnhancedVehicleForm";
import { scheduleVehicleReminders } from "@/lib/reminderScheduler";

/* ----------------------------- Small helpers ----------------------------- */
function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

async function readImageFile(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file.");
  if (file.size > 2 * 1024 * 1024) throw new Error("Image larger than 2MB. Please choose a smaller image (<2MB).");
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
        "inline-flex items-center rounded-full px-2 h-9 border transition focus:outline-none focus:ring-2 focus:ring-yellow-400 relative",
        checked ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"
      )}
      title={checked ? onLabel : offLabel}
    >
      <span className={cx("text-sm font-semibold text-gray-900 select-none transition-all", checked ? "ml-2 mr-8" : "ml-8 mr-2")}>
        {checked ? onLabel : offLabel}
      </span>
      <span
        className={cx(
          "absolute inline-flex items-center justify-center h-6 w-6 rounded-full shadow-sm transition",
          checked ? "right-1 bg-green-600 text-white" : "left-1 bg-gray-400 text-white"
        )}
      >
        {checked ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
      </span>
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
      setCars(loadMyCars());
      setSelectedId(getSelectedCarId());
      setPubState(isPublic());
      const onGarage = () => {
        setCars(loadMyCars());
        setSelectedId(getSelectedCarId());
        setPubState(isPublic());
      };
      window.addEventListener("ms:garage", onGarage as EventListener);
      return () => window.removeEventListener("ms:garage", onGarage as EventListener);
    } else {
      setPublicView(readPublicGarage(displayName));
      const onStorage = () => setPublicView(readPublicGarage(displayName));
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
    const next: CarType[] = [{ id, make: mk, model: md, year: yr, image: newImage }, ...cars];
    saveMyCars(next);
    setCars(next);

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
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="text-xl font-bold text-black">Garage</h2>
        <p className="mt-1 text-gray-700">This user’s garage is private.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-5">
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-2xl font-extrabold text-black tracking-tight">
            {mine ? "My Garage" : `${displayName}'s Garage`}
          </h2>
          {defaultCar && (
            <span className="inline-flex items-center text-[11px] font-bold px-2 py-1 rounded-full bg-yellow-500 text-black">
              Default: {vehicleLabel(defaultCar)}
            </span>
          )}
          {mine && (
            <button
              type="button"
              onClick={() => setCompact(v => !v)}
              className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white text-gray-900 text-xs px-2 py-1 hover:bg-gray-50"
            >
              {compact ? 'Expanded view' : 'Compact view'}
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {mine && (
            <>
              <button
                type="button"
                onClick={() => setOpenAdd((v) => !v)}
                className="inline-flex items-center gap-2 rounded-lg bg-yellow-500 text-black font-semibold px-4 py-2 hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              >
                <Plus className="h-4 w-4" /> Add vehicle
              </button>
              <Toggle checked={pub} onChange={togglePublic} />
              {pub && (
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
              )}
            </>
          )}
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
                  className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white text-gray-900 text-sm px-3 py-1.5 shadow hover:bg-gray-100 cursor-pointer focus-within:ring-2 focus-within:ring-yellow-400"
                  title="Change photo"
                >
                  <ImageIcon className="h-4 w-4" />
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
                  className="inline-flex items-center gap-1 rounded-md bg-yellow-500 text-black font-semibold px-3 py-1.5 text-sm shadow hover:bg-yellow-600"
                  title="Edit details"
                >
                  <PencilLine className="h-4 w-4" />
                  Edit
                </button>
              </div>
            )}

            {/* Bottom content */}
            <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-white font-extrabold text-xl sm:text-2xl truncate drop-shadow">
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

                <div className="flex items-center gap-2">
                  <a
                    href={buildSearchUrl(defaultCar)}
                    className="inline-flex items-center gap-1 rounded-md bg-white text-gray-900 text-sm px-3 py-1.5 shadow hover:bg-gray-50"
                    title="Find parts for this vehicle"
                  >
                    <LinkIcon className="h-4 w-4" /> Find parts
                  </a>
                  <button
                    type="button"
                    onClick={() => copyLabel(defaultCar.id, vehicleLabel(defaultCar))}
                    className={cx(
                      "inline-flex items-center gap-1 rounded-md text-sm px-3 py-1.5 border shadow",
                      copiedId === defaultCar.id
                        ? "bg-white border-green-300 text-green-700"
                        : "bg-white border-gray-200 text-gray-900 hover:bg-gray-50"
                    )}
                    title="Copy vehicle label"
                  >
                    <Copy className="h-4 w-4" />
                    {copiedId === defaultCar.id ? "Copied!" : "Copy label"}
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
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={() => saveEdit(defaultCar.id)}
                  className="inline-flex items-center gap-2 rounded-md bg-yellow-500 text-black font-semibold px-4 py-2 hover:bg-yellow-600"
                >
                  <Check className="h-4 w-4" /> Save
                </button>
                <button
                  onClick={cancelEdit}
                  className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white text-gray-900 px-4 py-2 hover:bg-gray-50"
                >
                  <X className="h-4 w-4" /> Cancel
                </button>
                {mine && (
                  <>
                    <label className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white text-gray-900 px-4 py-2 hover:bg-gray-50 cursor-pointer">
                      <ImageIcon className="h-4 w-4" />
                      Change photo
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
                        className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white text-gray-900 px-4 py-2 hover:bg-gray-50"
                      >
                        Remove photo
                      </button>
                    )}
                    <button
                      onClick={() => {
                        const ok = window.confirm("Delete this vehicle?");
                        if (ok) removeCar(defaultCar.id);
                      }}
                      className="inline-flex items-center gap-2 rounded-md text-red-700 border border-red-200 bg-white px-4 py-2 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stats for default car */}
      {defaultCar && (
        <div className="px-6 py-5">
          <GarageStats car={defaultCar} />
        </div>
      )}

      {/* Display Wall - Instagram-style grid of all vehicle photos */}
      <div className="px-6 pb-6">
        <DisplayWall cars={cars} />
      </div>

      {/* Add vehicle panel */}
      {mine && openAdd && (
        <div className="px-6 py-5 border-t border-gray-200 bg-gray-50/60">
          <EnhancedVehicleForm
            onSubmit={async (vehicle) => {
              const newCar: CarType = {
                id: String(Date.now()),
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
              saveMyCars([...cars, newCar]);
              setCars((prev) => [...prev, newCar]);
              if (cars.length === 0) setSelectedCarId(newCar.id);
              
              // Schedule reminders if enabled
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

  {/* Other cars grid */}
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
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-yellow-500 text-black font-semibold px-4 py-2 hover:bg-yellow-600"
            >
              <Plus className="h-4 w-4" /> Add vehicle
            </button>
          </div>
        )}

        {others.length > 0 && !compact && (
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                    "rounded-xl border border-gray-200 bg-white p-3 shadow-sm hover:shadow transition",
                    justChanged && "ms-card-ring"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-16 w-24 rounded-md bg-white border border-gray-200 flex items-center justify-center overflow-hidden shrink-0">
                      <CarThumb src={c.image} alt={label} />
                    </div>

                    {!isEditing ? (
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="font-semibold text-base text-black truncate">{label}</div>
                        </div>
                        <div className="text-sm text-gray-600">{c.make} {c.model}</div>

                        <div className="mt-1.5 flex flex-wrap items-center gap-2">
                          <a
                            href={searchUrl}
                            className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-md border border-gray-300 bg-white text-gray-900 hover:bg-gray-50"
                          >
                            <LinkIcon className="h-3.5 w-3.5" /> Find parts
                          </a>
                          <button
                            type="button"
                            onClick={() => copyLabel(c.id, label)}
                            className={cx(
                              "inline-flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-md border bg-white",
                              copiedId === c.id
                                ? "border-green-300 text-green-700"
                                : "border-gray-300 text-gray-900 hover:bg-gray-50"
                            )}
                          >
                            <Copy className="h-3.5 w-3.5" />
                            {copiedId === c.id ? "Copied!" : "Copy label"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 grid grid-cols-3 gap-2">
                        <input
                          value={editMake}
                          onChange={(e) => setEditMake(e.target.value)}
                          className="border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                          placeholder="Make"
                        />
                        <input
                          value={editModel}
                          onChange={(e) => setEditModel(e.target.value)}
                          className="border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                          placeholder="Model"
                        />
                        <input
                          value={editYear}
                          onChange={(e) => setEditYear(e.target.value)}
                          className="border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                          placeholder="Year"
                        />
                      </div>
                    )}

                    {mine && (
                      <div className="flex items-center gap-2 ml-auto">
                        {!isEditing ? (
                          <>
                            <button
                              type="button"
                              onClick={() => makeDefault(c.id)}
                              className="p-1.5 rounded transition focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-500 hover:text-gray-700"
                              title="Set as default"
                            >
                              <Star className="h-5 w-5" />
                            </button>

                            <label
                              htmlFor={inputId}
                              className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md border border-gray-300 bg-white text-gray-900 hover:bg-gray-50 cursor-pointer focus-within:ring-2 focus-within:ring-yellow-400"
                              title="Change photo"
                            >
                              <ImageIcon className="h-3.5 w-3.5" />
                              Photo
                            </label>
                            <input
                              id={inputId}
                              type="file"
                              accept="image/*"
                              hidden
                              onChange={async (e) => {
                                const f = e.target.files?.[0];
                                e.target.value = "";
                                if (f) await changeCarPhoto(c.id, f);
                              }}
                            />

                            <button
                              type="button"
                              onClick={() => startEdit(c)}
                              className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md bg-yellow-500 text-black font-semibold hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                              title="Edit details"
                            >
                              <PencilLine className="h-3.5 w-3.5" />
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                const ok = window.confirm("Delete this vehicle?");
                                if (ok) removeCar(c.id);
                              }}
                              className="p-1.5 rounded text-red-600 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-300"
                              title="Delete"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => saveEdit(c.id)}
                              className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md bg-yellow-500 text-black font-semibold hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                              title="Save"
                            >
                              <Check className="h-3.5 w-3.5" />
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={cancelEdit}
                              className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md border border-gray-300 bg-white text-gray-900 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                              title="Cancel"
                            >
                              <X className="h-3.5 w-3.5" />
                              Cancel
                            </button>
                          </>
                        )}
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
