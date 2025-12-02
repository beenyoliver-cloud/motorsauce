import { NextResponse } from "next/server";

/*
  DVLA Registration Lookup API
  - Expects query param: reg (string)
  - Returns: { make: string, model: string, year: number | null, trim?: string }
  - Reads DVLA API credentials from env

  Note: This implementation uses a generic pattern; replace DVLA_ENDPOINT and request shape
  with your actual DVLA API details. We keep a strict minimal contract so the UI can prefill
  Garage form fields even if some fields are missing.
*/

const DVLA_ENDPOINT = process.env.DVLA_ENDPOINT || ""; // e.g., https://api.dvla.gov.uk/vehicle/lookup
const DVLA_API_KEY = process.env.DVLA_API_KEY || ""; // provided by user

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const reg = (searchParams.get("reg") || "").trim().toUpperCase();

    if (!reg) {
      return NextResponse.json({ error: "Missing registration" }, { status: 400 });
    }

    if (!DVLA_API_KEY || !DVLA_ENDPOINT) {
      return NextResponse.json(
        { error: "DVLA lookup not configured" },
        { status: 501, headers: { "X-Feature": "dvla-registration-lookup" } }
      );
    }

    // Call DVLA API (adjust to match your provider)
    const url = `${DVLA_ENDPOINT}?registration=${encodeURIComponent(reg)}`;
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${DVLA_API_KEY}`,
        "Accept": "application/json",
      },
      // DVLA may require no caching to ensure fresh data
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json(
        { error: "Lookup failed", status: res.status, body: text },
        { status: 502 }
      );
    }

    const data = await res.json().catch(() => null);
    if (!data) {
      return NextResponse.json({ error: "Invalid response" }, { status: 502 });
    }

    // Map DVLA fields to our minimal contract; update this based on real field names
    // Example assumptions:
    // - data.make, data.model, data.yearOfManufacture or data.firstRegistrationDate
    // - Optional data.trim/spec
    const make = (data.make || data.Make || "").toString();
    const model = (data.model || data.Model || "").toString();
    const year = (() => {
      const y = data.yearOfManufacture ?? data.YearOfManufacture ?? null;
      if (typeof y === "number") return y;
      if (typeof y === "string") {
        const n = parseInt(y, 10);
        return Number.isFinite(n) ? n : null;
      }
      // Try date field
      const d = data.firstRegistrationDate || data.FirstRegistrationDate;
      if (typeof d === "string") {
        const yyyy = d.slice(0, 4);
        const n = parseInt(yyyy, 10);
        return Number.isFinite(n) ? n : null;
      }
      return null;
    })();
    const trim = (data.trim || data.Variant || data.Spec || "").toString() || undefined;

    return NextResponse.json({ make, model, year, trim });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 });
  }
}
