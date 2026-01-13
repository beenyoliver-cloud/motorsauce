// src/app/api/geocode/postcode/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type PostcodeCacheRow = {
  postcode: string;
  outcode: string;
  county: string | null;
  admin_district: string | null;
  region: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  lat_rounded: number | null;
  lng_rounded: number | null;
};

type OutcodeCacheRow = {
  outcode: string;
  counties: string[] | null;
  districts: string[] | null;
  regions: string[] | null;
  countries: string[] | null;
};

type PostcodesIoResult = {
  postcode: string;
  outcode: string;
  admin_county: string | null;
  admin_district: string | null;
  region: string | null;
  country: string | null;
  latitude: number;
  longitude: number;
};

type OutcodeIoResult = {
  outcode: string;
  admin_county?: string[] | null;
  admin_district?: string[] | null;
  region?: string[] | null;
  country?: string[] | null;
};

type CountyOptions = {
  options: string[];
  source: "admin_county" | "admin_district" | "region" | "none";
};

const POSTCODE_API = "https://api.postcodes.io";

function normalizePostcode(input: string) {
  return input.replace(/\s+/g, "").toUpperCase();
}

function dedupeList(list: Array<string | null | undefined>) {
  const cleaned = list
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean) as string[];
  return Array.from(new Set(cleaned));
}

function buildCountyOptions(data?: OutcodeIoResult | null): CountyOptions {
  if (!data) return { options: [], source: "none" };
  const counties = dedupeList(data.admin_county || []);
  const districts = dedupeList(data.admin_district || []);
  const regions = dedupeList(data.region || []);
  if (counties.length > 0) return { options: counties, source: "admin_county" };
  if (districts.length > 0) return { options: districts, source: "admin_district" };
  if (regions.length > 0) return { options: regions, source: "region" };
  return { options: [], source: "none" };
}

function getSupabaseAdmin() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceKey || !url) return null;
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function readPostcodeCache(
  supabase: ReturnType<typeof createClient> | null,
  postcode: string
): Promise<PostcodeCacheRow | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from("postcode_cache")
      .select("postcode, outcode, county, admin_district, region, country, latitude, longitude, lat_rounded, lng_rounded")
      .eq("postcode", postcode)
      .single();
    if (error) return null;
    return data as PostcodeCacheRow;
  } catch {
    return null;
  }
}

async function readOutcodeCache(
  supabase: ReturnType<typeof createClient> | null,
  outcode: string
): Promise<OutcodeCacheRow | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from("postcode_outcode_cache")
      .select("outcode, counties, districts, regions, countries")
      .eq("outcode", outcode)
      .single();
    if (error) return null;
    return data as OutcodeCacheRow;
  } catch {
    return null;
  }
}

async function upsertPostcodeCache(
  supabase: ReturnType<typeof createClient> | null,
  payload: PostcodeCacheRow & { source: string }
) {
  if (!supabase) return;
  try {
    await supabase
      .from("postcode_cache")
      .upsert({ ...payload, updated_at: new Date().toISOString() }, { onConflict: "postcode" });
  } catch {
    /* ignore cache failures */
  }
}

async function upsertOutcodeCache(
  supabase: ReturnType<typeof createClient> | null,
  payload: OutcodeCacheRow & { source: string }
) {
  if (!supabase) return;
  try {
    await supabase
      .from("postcode_outcode_cache")
      .upsert({ ...payload, updated_at: new Date().toISOString() }, { onConflict: "outcode" });
  } catch {
    /* ignore cache failures */
  }
}

// Using postcodes.io - free UK postcode API
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const postcode = searchParams.get("postcode");

    if (!postcode) {
      return NextResponse.json({ error: "Postcode required" }, { status: 400 });
    }

    const cleanPostcode = normalizePostcode(postcode);
    const supabaseAdmin = getSupabaseAdmin();

    // Cache-first lookup
    const cached = await readPostcodeCache(supabaseAdmin, cleanPostcode);
    if (cached) {
      let countyOptions: CountyOptions = { options: [], source: "none" };
      const outcodeCache = await readOutcodeCache(supabaseAdmin, cached.outcode);
      if (outcodeCache) {
        countyOptions = buildCountyOptions({
          outcode: outcodeCache.outcode,
          admin_county: outcodeCache.counties || [],
          admin_district: outcodeCache.districts || [],
          region: outcodeCache.regions || [],
          country: outcodeCache.countries || [],
        });
      } else {
        const outcodeResponse = await fetch(`${POSTCODE_API}/outcodes/${encodeURIComponent(cached.outcode)}`);
        if (outcodeResponse.ok) {
          const outcodeData = await outcodeResponse.json();
          const outcodeResult = outcodeData?.result as OutcodeIoResult | undefined;
          if (outcodeResult) {
            countyOptions = buildCountyOptions(outcodeResult);
            await upsertOutcodeCache(supabaseAdmin, {
              outcode: outcodeResult.outcode,
              counties: dedupeList(outcodeResult.admin_county || []),
              districts: dedupeList(outcodeResult.admin_district || []),
              regions: dedupeList(outcodeResult.region || []),
              countries: dedupeList(outcodeResult.country || []),
              source: "postcodes_io",
            });
          }
        }
      }

      return NextResponse.json({
        postcode: cached.postcode,
        outcode: cached.outcode,
        county: cached.county,
        admin_district: cached.admin_district,
        region: cached.region,
        country: cached.country,
        latitude: cached.latitude,
        longitude: cached.longitude,
        lat_rounded: cached.lat_rounded,
        lng_rounded: cached.lng_rounded,
        county_options: countyOptions.options,
        county_source: countyOptions.source,
        cached: true,
      });
    }

    // Call postcodes.io API
    const response = await fetch(`${POSTCODE_API}/postcodes/${encodeURIComponent(cleanPostcode)}`);

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json({ error: "Invalid postcode" }, { status: 404 });
      }
      throw new Error("Geocoding API error");
    }

    const data = await response.json();

    if (!data.result) {
      return NextResponse.json({ error: "Invalid postcode" }, { status: 404 });
    }

    const result = data.result as PostcodesIoResult;
    const county = result.admin_county || result.admin_district || result.region || null;
    const latRounded = Math.round(result.latitude * 100) / 100;
    const lngRounded = Math.round(result.longitude * 100) / 100;

    // Load outcode ambiguity data
    let outcodeOptions: CountyOptions = { options: [], source: "none" };
    if (result.outcode) {
      let outcodeCache = await readOutcodeCache(supabaseAdmin, result.outcode);
      if (!outcodeCache) {
        const outcodeResponse = await fetch(`${POSTCODE_API}/outcodes/${encodeURIComponent(result.outcode)}`);
        if (outcodeResponse.ok) {
          const outcodeData = await outcodeResponse.json();
          const outcodeResult = outcodeData?.result as OutcodeIoResult | undefined;
          if (outcodeResult) {
            outcodeOptions = buildCountyOptions(outcodeResult);
            outcodeCache = {
              outcode: outcodeResult.outcode,
              counties: dedupeList(outcodeResult.admin_county || []),
              districts: dedupeList(outcodeResult.admin_district || []),
              regions: dedupeList(outcodeResult.region || []),
              countries: dedupeList(outcodeResult.country || []),
            };
            await upsertOutcodeCache(supabaseAdmin, { ...outcodeCache, source: "postcodes_io" });
          }
        }
      } else {
        outcodeOptions = buildCountyOptions({
          outcode: outcodeCache.outcode,
          admin_county: outcodeCache.counties || [],
          admin_district: outcodeCache.districts || [],
          region: outcodeCache.regions || [],
          country: outcodeCache.countries || [],
        });
      }
    }

    await upsertPostcodeCache(supabaseAdmin, {
      postcode: cleanPostcode,
      outcode: result.outcode,
      county,
      admin_district: result.admin_district,
      region: result.region,
      country: result.country,
      latitude: result.latitude,
      longitude: result.longitude,
      lat_rounded: latRounded,
      lng_rounded: lngRounded,
      source: "postcodes_io",
    });

    return NextResponse.json({
      postcode: result.postcode,
      outcode: result.outcode,
      county,
      admin_district: result.admin_district,
      region: result.region,
      country: result.country,
      latitude: result.latitude,
      longitude: result.longitude,
      lat_rounded: latRounded,
      lng_rounded: lngRounded,
      county_options: outcodeOptions.options,
      county_source: outcodeOptions.source,
      cached: false,
    });
  } catch (error) {
    console.error("Error geocoding postcode:", error);
    return NextResponse.json({ error: "Failed to geocode postcode" }, { status: 500 });
  }
}
