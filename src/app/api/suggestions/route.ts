import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabase as supabaseServerAnon } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

const ACTIVE_CAR_COOKIE = "ms_active_car";

// Use anon key server client to respect RLS
const supabase = supabaseServerAnon;

type ListingRow = {
  id: string | number;
  title: string;
  price_cents?: number | null;
  price?: number | string | null;
  image_url?: string | null;
  image?: string | null;
  images?: string[] | null;
  make?: string | null;
  model?: string | null;
  created_at?: string | null;
  reserved_until?: string | null;
};

type GarageCar = { make?: string; model?: string };

function toPrice(row: ListingRow): string {
  if (typeof row?.price_cents === "number") return "£" + (row.price_cents / 100).toFixed(2);
  if (typeof row?.price === "number") return "£" + Number(row.price).toFixed(2);
  if (typeof row?.price === "string") return row.price.startsWith("£") ? row.price : `£${row.price}`;
  return "£0.00";
}

const PLACEHOLDER_SUFFIXES = ["/images/placeholder.jpg", "/images/placeholder.png"];

function stripQuery(url: string) {
  return url.split("?")[0]?.split("#")[0] || url;
}

function isPlaceholderUrl(url: string): boolean {
  const base = stripQuery(url).toLowerCase();
  return PLACEHOLDER_SUFFIXES.some((suffix) => base.endsWith(suffix));
}

function normalizeImages(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((value) => {
      if (typeof value === "string") return value.trim();
      if (value && typeof value === "object" && "url" in value) {
        const maybeUrl = (value as { url?: unknown }).url;
        return typeof maybeUrl === "string" ? maybeUrl.trim() : "";
      }
      return "";
    })
    .filter((url) => url.length > 0 && !isPlaceholderUrl(url));
}

function isReservationActive(reservedUntil?: string | null) {
  if (!reservedUntil) return false;
  const ts = Date.parse(reservedUntil);
  return Number.isFinite(ts) && ts > Date.now();
}

function mapRow(row: ListingRow) {
  const imagesFromArray = normalizeImages(row?.images);
  const images =
    imagesFromArray.length > 0
      ? imagesFromArray
      : row?.image_url && !isPlaceholderUrl(row.image_url)
      ? [row.image_url]
      : row?.image && !isPlaceholderUrl(row.image)
      ? [row.image]
      : [];
  return {
    id: row.id,
    title: row.title,
    price: toPrice(row),
    image: images[0] || "/images/placeholder.jpg",
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as { garage?: unknown; searches?: unknown }));
    const garage: GarageCar[] = Array.isArray(body?.garage) ? (body.garage as GarageCar[]) : [];
    const searches: string[] = Array.isArray(body?.searches) ? body.searches : [];

    // Also read active car from cookie for server-side personalization
    const cookieStore = await cookies();
    const activeCarRaw = cookieStore.get(ACTIVE_CAR_COOKIE)?.value;
    let activeCar: GarageCar | null = null;
    if (activeCarRaw) {
      try {
        const parsed = JSON.parse(activeCarRaw);
        if (parsed?.make || parsed?.model) {
          activeCar = { make: parsed.make, model: parsed.model };
        }
      } catch {}
    }

    const results = new Map<string | number, ListingRow>();

    // Gather makes/models from garage + active car cookie
    const makes = Array.from(new Set([
      ...garage.map((c) => (c.make || "").trim()).filter(Boolean),
      ...(activeCar?.make ? [activeCar.make.trim()] : []),
    ]));
    const models = Array.from(new Set([
      ...garage.map((c) => (c.model || "").trim()).filter(Boolean),
      ...(activeCar?.model ? [activeCar.model.trim()] : []),
    ]));

    // Query by make
    if (makes.length) {
  const { data, error } = await supabase.from("listings").select("*").in("make", makes).eq("status", "active").limit(50);
  if (!error && Array.isArray(data)) {
    for (const r of (data as ListingRow[])) {
      if (!isReservationActive(r.reserved_until)) results.set(String(r.id), r);
    }
  }
    }

    // Query by model
    if (models.length) {
  const { data, error } = await supabase.from("listings").select("*").in("model", models).eq("status", "active").limit(50);
  if (!error && Array.isArray(data)) {
    for (const r of (data as ListingRow[])) {
      if (!isReservationActive(r.reserved_until)) results.set(String(r.id), r);
    }
  }
    }

    // Query by recent searches (title match)
    for (const term of searches.slice(0, 5)) {
      if (!term || typeof term !== "string") continue;
      const q = `%${term.replace(/%/g, "\\%").trim()}%`;
  const { data, error } = await supabase.from("listings").select("*").ilike("title", q).eq("status", "active").limit(20);
  if (!error && Array.isArray(data)) {
    for (const r of (data as ListingRow[])) {
      if (!isReservationActive(r.reserved_until)) results.set(String(r.id), r);
    }
  }
    }

    // If nothing found yet, return most recent uploads (so the section isn't empty)
    if (!results.size) {
  const { data, error } = await supabase.from("listings").select("*").eq("status", "active").order("created_at", { ascending: false }).limit(12);
  if (!error && Array.isArray(data)) {
    for (const r of (data as ListingRow[])) {
      if (!isReservationActive(r.reserved_until)) results.set(String(r.id), r);
    }
  }
    }

    const out = Array.from(results.values()).slice(0, 24).map(mapRow);
    return NextResponse.json(out, { status: 200 });
  } catch (err) {
    console.error("Suggestions error", err);
    return NextResponse.json([], { status: 200 });
  }
}
