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

    // Call DVLA API - uses POST with registrationNumber in body and x-api-key header
    const res = await fetch(DVLA_ENDPOINT, {
      method: "POST",
      headers: {
        "x-api-key": DVLA_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        registrationNumber: reg,
      }),
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[DVLA Lookup] Failed:", res.status, text);
      return NextResponse.json(
        { error: "Lookup failed", status: res.status, details: text },
        { status: res.status === 404 ? 404 : 502 }
      );
    }

    const data = await res.json().catch(() => null);
    if (!data) {
      return NextResponse.json({ error: "Invalid response from DVLA" }, { status: 502 });
    }

    console.log("[DVLA Lookup] Success:", { reg, data });

    // Map DVLA fields to our minimal contract
    // DVLA returns: make, model, yearOfManufacture, colour, fuelType, engineCapacity, etc.
    const make = (data.make || "").toString();
    const model = (data.model || "").toString();
    const year = (() => {
      const y = data.yearOfManufacture;
      if (typeof y === "number") return y;
      if (typeof y === "string") {
        const n = parseInt(y, 10);
        return Number.isFinite(n) ? n : null;
      }
      return null;
    })();
    
    // Build trim from available data (fuel type, engine capacity)
    const trimParts = [];
    if (data.fuelType) trimParts.push(data.fuelType);
    if (data.engineCapacity) trimParts.push(`${data.engineCapacity}cc`);
    const trim = trimParts.length > 0 ? trimParts.join(" ") : undefined;

    return NextResponse.json({ make, model, year, trim });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 });
  }
}
