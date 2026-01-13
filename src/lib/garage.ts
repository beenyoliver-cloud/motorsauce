// src/lib/garage.ts
"use client";

import { nsKey } from "@/lib/auth";

export type Car = {
  id: string;
  make: string;
  model: string;
  year: string;
  
  // Visual
  /** Primary photo - Data URL or remote URL. When absent, UI will show a silhouette fallback. */
  image?: string;
  /** Additional photos for gallery/display wall */
  photos?: string[];
  /** Actual vehicle color for visual display */
  color?: string;
  
  // Registration & Identity
  /** Vehicle registration plate (SENSITIVE - respect privacy flags) */
  registration?: string;
  /** Hide registration from public view */
  hideRegistration?: boolean;
  /** Vehicle VIN (SENSITIVE - never shown publicly) */
  vin?: string;
  /** Trim level / variant */
  trim?: string;
  
  // Tracking & Reminders
  /** Current mileage */
  mileage?: number;
  /** MOT expiry date (ISO string) */
  motExpiry?: string;
  /** MOT reminder enabled */
  motReminder?: boolean;
  /** Insurance expiry date (ISO string) */
  insuranceExpiry?: string;
  /** Insurance reminder enabled */
  insuranceReminder?: boolean;
  /** Last service date (ISO string) */
  lastService?: string;
  /** Last service mileage */
  lastServiceMileage?: number;
  
  // Notes & History
  /** Personal notes about this vehicle */
  notes?: string;
  /** Service history entries */
  serviceHistory?: Array<{
    date: string;
    mileage: number;
    description: string;
    cost?: number;
  }>;
  
  // Marketplace Integration
  /** Watch for compatible parts */
  watchParts?: boolean;
  /** User wants to sell this vehicle */
  forSale?: boolean;
  
  // Privacy Controls
  /** Hide mileage from public view */
  hideMileage?: boolean;
  /** Hide service history from public view */
  hideServiceHistory?: boolean;
};

const K_CARS = () => nsKey("garage_cars_v2"); // keep v2 key from prior update
const K_PUBLIC = (username: string) => `ms_public_garage:${normalize(username)}`;
const K_SELECTED = () => nsKey("garage_selected");
const K_VIS = () => nsKey("garage_public"); // "1" | "0"

const normalize = (v: string) =>
  String(v || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");

/** Fallback used by UI when a car has no image */
export function fallbackCarImage(): string {
  return "/images/car-silhouette.png";
}

/* --------- Owner side (signed-in user) --------- */
export function loadMyCars(): Car[] {
  const cars = readCarsFromStorage();
  maybeSyncActiveCar(cars);
  return cars;
}

function readCarsFromStorage(): Car[] {
  try {
    const raw = localStorage.getItem(K_CARS());
    const arr = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(arr)) return [];
    return arr.map((c) => {
      const obj = (c && typeof c === "object" ? c : {}) as Record<string, unknown>;
      return {
        id: String(obj.id ?? ""),
        make: String(obj.make ?? ""),
        model: String(obj.model ?? ""),
        year: String(obj.year ?? ""),
        image: typeof obj.image === "string" && obj.image ? obj.image : undefined,
        photos: Array.isArray(obj.photos) ? obj.photos.filter((p) => typeof p === "string") : undefined,
        color: typeof obj.color === "string" ? obj.color : undefined,
        registration: typeof obj.registration === "string" ? obj.registration : undefined,
        hideRegistration: obj.hideRegistration === true,
        vin: typeof obj.vin === "string" ? obj.vin : undefined,
        trim: typeof obj.trim === "string" ? obj.trim : undefined,
        mileage: typeof obj.mileage === "number" ? obj.mileage : undefined,
        motExpiry: typeof obj.motExpiry === "string" ? obj.motExpiry : undefined,
        motReminder: obj.motReminder === true,
        insuranceExpiry: typeof obj.insuranceExpiry === "string" ? obj.insuranceExpiry : undefined,
        insuranceReminder: obj.insuranceReminder === true,
        lastService: typeof obj.lastService === "string" ? obj.lastService : undefined,
        lastServiceMileage: typeof obj.lastServiceMileage === "number" ? obj.lastServiceMileage : undefined,
        notes: typeof obj.notes === "string" ? obj.notes : undefined,
        serviceHistory: Array.isArray(obj.serviceHistory) ? obj.serviceHistory : undefined,
        watchParts: obj.watchParts === true,
        forSale: obj.forSale === true,
        hideMileage: obj.hideMileage === true,
        hideServiceHistory: obj.hideServiceHistory === true,
      } satisfies Car;
    });
  } catch {
    return [];
  }
}

function mergeCarsById(serverCars: Car[], localCars: Car[]): Car[] {
  const serverIds = new Set<string>();
  const merged: Car[] = [];
  for (const car of serverCars) {
    if (!car?.id) continue;
    serverIds.add(car.id);
    merged.push(car);
  }
  for (const car of localCars) {
    if (!car?.id || serverIds.has(car.id)) continue;
    merged.push(car);
  }
  return merged;
}

export function saveMyCars(cars: Car[]) {
  localStorage.setItem(K_CARS(), JSON.stringify(cars));
  window.dispatchEvent(new Event("ms:garage"));
  // Always sync to database for logged-in users (regardless of public visibility)
  void syncGarageToDatabase(cars);
  if (isPublic()) publishPublicCopy();
  maybeSyncActiveCar(cars);
}

/** Sync garage to database for permanent storage */
async function syncGarageToDatabase(cars: Car[]) {
  try {
    const { supabaseBrowser } = await import("./supabase");
    const supabase = supabaseBrowser();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      // Not logged in, can't sync to database
      return;
    }
    
    const username = await currentUsername();
    if (!username) return;
    
    const selected = getSelectedCarId();
    const isPub = isPublic();
    
    // Sync to database - this ensures garage persists across devices/browsers
    await fetch("/api/garage", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        username,
        cars: isPub ? cars.map(sanitizeCarForPublic) : cars,
        selected_car_id: selected,
        is_public: isPub,
      }),
    });
  } catch (err) {
    console.error("Failed to sync garage to database:", err);
  }
}

/** Load garage from database and merge with localStorage */
export async function loadGarageFromDatabase(): Promise<Car[] | null> {
  try {
    const { supabaseBrowser } = await import("./supabase");
    const supabase = supabaseBrowser();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) return null;
    
    const { data: garage, error } = await supabase
      .from("public_garages")
      .select("cars, selected_car_id, is_public")
      .eq("user_id", session.user.id)
      .maybeSingle();
    
    if (error || !garage) return null;
    
    const serverCars = Array.isArray(garage.cars) ? garage.cars as Car[] : [];
    const localCars = readCarsFromStorage();
    const serverIds = new Set(serverCars.map((car) => car.id).filter(Boolean));
    const localOnly = localCars.filter((car) => car?.id && !serverIds.has(car.id));
    const mergedCars = mergeCarsById(serverCars, localCars);
    const nextSelected =
      garage.selected_car_id || getSelectedCarId() || mergedCars[0]?.id || null;
    
    localStorage.setItem(K_CARS(), JSON.stringify(mergedCars));
    if (nextSelected) {
      localStorage.setItem(K_SELECTED(), nextSelected);
    } else {
      localStorage.removeItem(K_SELECTED());
    }
    if (typeof garage.is_public === "boolean") {
      localStorage.setItem(K_VIS(), garage.is_public ? "1" : "0");
    }
    window.dispatchEvent(new Event("ms:garage"));
    
    if (localOnly.length > 0) {
      void syncGarageToDatabase(mergedCars);
    }

    return mergedCars;
  } catch (err) {
    console.error("Failed to load garage from database:", err);
    return null;
  }
}

/** Sanitize car data for public viewing - removes sensitive information */
function sanitizeCarForPublic(car: Car): Car {
  const sanitized = { ...car };
  
  // Always hide VIN from public
  delete sanitized.vin;
  
  // Respect privacy flags
  if (car.hideRegistration) delete sanitized.registration;
  if (car.hideMileage) delete sanitized.mileage;
  if (car.hideServiceHistory) {
    delete sanitized.serviceHistory;
    delete sanitized.lastService;
    delete sanitized.lastServiceMileage;
  }
  
  // Never show reminder settings publicly
  delete sanitized.motReminder;
  delete sanitized.insuranceReminder;
  
  // Don't show "for sale" status
  delete sanitized.forSale;
  
  return sanitized;
}

export function getSelectedCarId(): string | null {
  return localStorage.getItem(K_SELECTED());
}
export function setSelectedCarId(id: string | null) {
  if (!id) localStorage.removeItem(K_SELECTED());
  else localStorage.setItem(K_SELECTED(), id);
  window.dispatchEvent(new Event("ms:garage"));
  maybeSyncActiveCar();
}

export function isPublic(): boolean {
  return localStorage.getItem(K_VIS()) === "1";
}
export async function setPublic(pub: boolean, username?: string) {
  localStorage.setItem(K_VIS(), pub ? "1" : "0");
  if (pub) await publishPublicCopy(username);
  else await removePublicCopy(username);
  window.dispatchEvent(new Event("ms:garage"));
}

type ActiveCarSyncPayload = {
  id?: string;
  make?: string;
  model?: string;
  year?: number;
};

const ACTIVE_CAR_SYNC_ENDPOINT = "/api/garage/active";
let lastSyncedActiveCarJSON: string | null = null;

function maybeSyncActiveCar(cars?: Car[]) {
  if (typeof window === "undefined") return;
  const list = Array.isArray(cars) ? cars : readCarsFromStorage();
  const selectedId = getSelectedCarId();
  const active = selectedId ? list.find((c) => c.id === selectedId) : list[0];
  const payload = buildSyncPayload(active);
  const serialized = JSON.stringify(payload ?? null);
  if (serialized === lastSyncedActiveCarJSON) return;
  lastSyncedActiveCarJSON = serialized;
  void syncServerActiveCar(payload);
}

function buildSyncPayload(car?: Car): ActiveCarSyncPayload | null {
  if (!car) return null;
  const make = String(car.make ?? "").trim();
  const model = String(car.model ?? "").trim();
  const yearNumber = Number(String(car.year ?? "").replace(/[^\d]/g, ""));
  const payload: ActiveCarSyncPayload = {};
  if (car.id) payload.id = String(car.id);
  if (make) payload.make = make;
  if (model) payload.model = model;
  if (Number.isFinite(yearNumber)) payload.year = yearNumber;
  if (!payload.id && !payload.make && !payload.model && typeof payload.year !== "number") {
    return null;
  }
  return payload;
}

async function syncServerActiveCar(payload: ActiveCarSyncPayload | null) {
  if (typeof fetch === "undefined") return;
  try {
    await fetch(ACTIVE_CAR_SYNC_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ car: payload }),
      keepalive: true,
    });
  } catch {
    // Swallow network errors; UI will remain functional without server personalization
  }
}

/* --------- Public copy (for others to view) --------- */
export async function publishPublicCopy(username?: string) {
  try {
    const u = username ?? await currentUsername();
    if (!u) return;
    const cars = loadMyCars();
    // Sanitize cars before making public
    const sanitizedCars = cars.map(sanitizeCarForPublic);
    const selected = getSelectedCarId();
    
    // Get auth token
    const { supabaseBrowser } = await import("./supabase");
    const supabase = supabaseBrowser();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.warn("No session available to publish garage");
      return;
    }
    
    // Save to database
    await fetch("/api/garage", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        username: u,
        cars: sanitizedCars,
        selected_car_id: selected,
        is_public: true,
      }),
    });
    
    // Keep localStorage as backup for now
    const payload = { cars: sanitizedCars, selected };
    localStorage.setItem(K_PUBLIC(u), JSON.stringify(payload));
  } catch (err) {
    console.error("Failed to publish garage:", err);
  }
}

export async function removePublicCopy(username?: string) {
  try {
    const u = username ?? await currentUsername();
    if (!u) return;
    
    // Get auth token
    const { supabaseBrowser } = await import("./supabase");
    const supabase = supabaseBrowser();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.warn("No session available to remove garage");
      return;
    }
    
    // Update database to set is_public = false
    await fetch("/api/garage", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        username: u,
        cars: [],
        selected_car_id: null,
        is_public: false,
      }),
    });
    
    // Remove from localStorage
    localStorage.removeItem(K_PUBLIC(u));
  } catch (err) {
    console.error("Failed to remove public garage:", err);
  }
}

export async function readPublicGarage(
  username: string
): Promise<{ cars: Car[]; selected?: string | null } | null> {
  try {
    // First try to fetch from API
    const response = await fetch(`/api/garage?username=${encodeURIComponent(username)}`);
    if (response.ok) {
      const data = await response.json();
      if (data?.is_public === false) {
        return null;
      }
      if (Array.isArray(data.cars)) {
        return {
          cars: data.cars,
          selected: data.selected_car_id || null,
        };
      }
    }
    
    // Fallback to localStorage (for backward compatibility)
    const raw = localStorage.getItem(K_PUBLIC(username));
    if (!raw) return null;
    const obj = JSON.parse(raw) as { cars?: unknown; selected?: unknown };
    if (!obj || typeof obj !== "object") return null;
    const list = (obj as Record<string, unknown>).cars;
    const cars: Car[] = Array.isArray(list)
      ? (list as unknown[]).map((c) => {
          const rec = (c && typeof c === "object" ? c : {}) as Record<string, unknown>;
          return {
            id: String(rec.id ?? ""),
            make: String(rec.make ?? ""),
            model: String(rec.model ?? ""),
            year: String(rec.year ?? ""),
            image: typeof rec.image === "string" && rec.image ? rec.image : undefined,
          } satisfies Car;
        })
      : [];
    const sel = (obj as Record<string, unknown>).selected;
    return { cars, selected: (typeof sel === "string" || sel === null || typeof sel === "undefined") ? (sel as string | null | undefined) : null };
  } catch {
    return null;
  }
}

/* --------- Utils --------- */
async function currentUsername(): Promise<string | null> {
  try {
    const { getCurrentUser } = await import("./auth");
    const user = await getCurrentUser();
    return user?.name || null;
  } catch {
    return null;
  }
}

export function vehicleLabel(car?: Car | null) {
  if (!car) return "";
  const y = car.year?.trim();
  const mk = car.make?.trim();
  const md = car.model?.trim();
  return [y, mk, md].filter(Boolean).join(" ");
}
