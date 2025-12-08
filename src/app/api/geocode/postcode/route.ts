// src/app/api/geocode/postcode/route.ts
import { NextRequest, NextResponse } from "next/server";

// Using postcodes.io - free UK postcode geocoding API
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const postcode = searchParams.get("postcode");

    if (!postcode) {
      return NextResponse.json({ error: "Postcode required" }, { status: 400 });
    }

    // Clean postcode
    const cleanPostcode = postcode.replace(/\s+/g, "").toUpperCase();

    // Call postcodes.io API
    const response = await fetch(
      `https://api.postcodes.io/postcodes/${encodeURIComponent(cleanPostcode)}`
    );

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

    // Return latitude and longitude
    return NextResponse.json({
      postcode: data.result.postcode,
      latitude: data.result.latitude,
      longitude: data.result.longitude,
      // Round to 2 decimal places for privacy (accuracy ~1km)
      lat_rounded: Math.round(data.result.latitude * 100) / 100,
      lng_rounded: Math.round(data.result.longitude * 100) / 100,
    });
  } catch (error) {
    console.error("Error geocoding postcode:", error);
    return NextResponse.json({ error: "Failed to geocode postcode" }, { status: 500 });
  }
}
