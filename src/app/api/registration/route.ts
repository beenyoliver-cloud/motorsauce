// API endpoint for UK vehicle registration lookup
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/registration?reg=AB12CDE
 * 
 * Looks up vehicle details from UK registration plate.
 * Returns: { make, model, year, gen?, engine? }
 * 
 * IMPLEMENTATION OPTIONS:
 * 1. DVLA Vehicle Enquiry Service API (requires API key)
 * 2. Third-party services (CarCheck, HPI, etc.)
 * 3. Mock data for development/testing
 */

type VehicleData = {
  make?: string;
  model?: string;
  year?: number;
  gen?: string;
  engine?: string;
  color?: string;
  motExpiry?: string; // ISO date
  taxStatus?: string;
  taxDue?: string; // ISO date
};

// Mock vehicle database for development
// Replace this with real DVLA API integration
const MOCK_VEHICLES: Record<string, VehicleData> = {
  "AB12CDE": {
    make: "BMW",
    model: "3 Series",
    year: 2015,
    gen: "F30",
    engine: "2.0 Diesel",
    color: "Black",
    motExpiry: "2025-08-15",
    taxStatus: "Taxed",
    taxDue: "2025-12-01",
  },
  "XY34FGH": {
    make: "Audi",
    model: "A4",
    year: 2018,
    gen: "B9",
    engine: "2.0 TFSI",
    color: "Silver",
    motExpiry: "2025-06-20",
    taxStatus: "Taxed",
    taxDue: "2026-01-15",
  },
  "LM56NOP": {
    make: "Volkswagen",
    model: "Golf",
    year: 2020,
    gen: "Mk8",
    engine: "1.5 TSI",
    color: "White",
    motExpiry: "2025-11-30",
    taxStatus: "Taxed",
    taxDue: "2025-12-31",
  },
};

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const reg = searchParams.get("reg") || "";
    if (!reg) {
      return NextResponse.json({ error: "Missing registration parameter" }, { status: 400 });
    }
    const normalizedReg = reg.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (normalizedReg.length < 2 || normalizedReg.length > 8) {
      return NextResponse.json({ error: "Invalid UK registration format" }, { status: 400 });
    }
    // Forward to unified DVLA lookup route for single implementation
    const forwardUrl = `${request.nextUrl.origin}/api/garage/registration-lookup?reg=${encodeURIComponent(normalizedReg)}`;
    const res = await fetch(forwardUrl, { cache: "no-store" });
    const bodyText = await res.text();
    return new NextResponse(bodyText, { status: res.status, headers: { "content-type": res.headers.get("content-type") || "application/json" } });
  } catch (error) {
    console.error("Registration lookup error:", error);
    return NextResponse.json({ error: "Failed to lookup registration" }, { status: 500 });
  }
}

/**
 * DVLA API Integration Example (requires setup)
 * 
 * To use the DVLA Vehicle Enquiry Service:
 * 1. Register at https://developer-portal.driver-vehicle-licensing.api.gov.uk/
 * 2. Get API key
 * 3. Add to .env.local: DVLA_API_KEY=your_key_here
 * 4. Uncomment and use this function
 */
/*
async function lookupDVLA(registrationNumber: string): Promise<VehicleData | null> {
  const apiKey = process.env.DVLA_API_KEY;
  
  if (!apiKey) {
    console.warn("DVLA_API_KEY not configured");
    return null;
  }

  try {
    const response = await fetch(
      "https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles",
      {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          registrationNumber,
        }),
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    // Map DVLA response to our format
    return {
      make: data.make,
      model: data.model,
      year: data.yearOfManufacture,
      engine: data.engineCapacity ? `${data.engineCapacity}cc ${data.fuelType}` : undefined,
    };
  } catch (error) {
    console.error("DVLA API error:", error);
    return null;
  }
}
*/

/**
 * Third-Party API Integration Example
 * Services like CarCheck, HPI, AutoCheck etc. offer vehicle lookup APIs
 */
/*
async function lookupThirdParty(registrationNumber: string): Promise<VehicleData | null> {
  const apiKey = process.env.VEHICLE_API_KEY;
  const apiUrl = process.env.VEHICLE_API_URL;
  
  if (!apiKey || !apiUrl) {
    return null;
  }

  try {
    const response = await fetch(
      `${apiUrl}?reg=${registrationNumber}&key=${apiKey}`,
      { cache: "no-store" }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    // Map third-party response to our format
    return {
      make: data.Make,
      model: data.Model,
      year: data.Year,
      engine: data.EngineSize,
      gen: data.Generation,
    };
  } catch (error) {
    console.error("Third-party API error:", error);
    return null;
  }
}
*/
