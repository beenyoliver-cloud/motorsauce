// src/lib/garage.ts
"use client";

import { nsKey } from "@/lib/auth";

export type Car = {
  id: string;
  make: string;
  model: string;
  year: string;
  /** Data URL or remote URL. When absent, UI will show a silhouette fallback. */
  image?: string;
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
      } satisfies Car;
    });
  } catch {
    return [];
  }
}

export function saveMyCars(cars: Car[]) {
  localStorage.setItem(
    K_CARS(),
    JSON.stringify(
      cars.map((c) => ({
        id: String(c.id),
        make: String(c.make || ""),
        model: String(c.model || ""),
        year: String(c.year || ""),
        image: typeof c.image === "string" && c.image ? c.image : undefined,
      }))
    )
  );
  window.dispatchEvent(new Event("ms:garage"));
  if (isPublic()) publishPublicCopy();
}

export function getSelectedCarId(): string | null {
  return localStorage.getItem(K_SELECTED());
}
export function setSelectedCarId(id: string | null) {
  if (!id) localStorage.removeItem(K_SELECTED());
  else localStorage.setItem(K_SELECTED(), id);
  window.dispatchEvent(new Event("ms:garage"));
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

/* --------- Public copy (for others to view) --------- */
export async function publishPublicCopy(username?: string) {
  try {
    const u = username ?? await currentUsername();
    if (!u) return;
    const cars = loadMyCars();
    const selected = getSelectedCarId();
    const payload = { cars, selected };
    localStorage.setItem(K_PUBLIC(u), JSON.stringify(payload));
  } catch {}
}
export async function removePublicCopy(username?: string) {
  try {
    const u = username ?? await currentUsername();
    if (!u) return;
    localStorage.removeItem(K_PUBLIC(u));
  } catch {}
}
export function readPublicGarage(
  username: string
): { cars: Car[]; selected?: string | null } | null {
  try {
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
