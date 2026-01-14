import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

type Suggestion = {
  type: "part" | "seller";
  label: string;
  subtitle?: string;
  url: string;
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = (searchParams.get("q") || "").trim().toLowerCase();

  if (!query || query.length < 2) {
    return NextResponse.json({ suggestions: [] });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return NextResponse.json({ suggestions: [] });
  }

  try {
    const supabase = createClient(url, key, {
      auth: { persistSession: false },
    });

    const isReservationActive = (reservedUntil?: string | null) => {
      if (!reservedUntil) return false;
      const ts = Date.parse(reservedUntil);
      return Number.isFinite(ts) && ts > Date.now();
    };

    // Search parts (listings) - match title, make, model, description
    const { data: listings } = await supabase
      .from("listings")
      .select("id, title, make, model, price, reserved_until")
      .eq("status", "active")
      .or(`title.ilike.%${query}%,make.ilike.%${query}%,model.ilike.%${query}%,description.ilike.%${query}%`)
      .limit(5);

    // Search sellers (profiles) - match name
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, name")
      .ilike("name", `%${query}%`)
      .limit(5);

    const suggestions: Suggestion[] = [];

    // Add seller suggestions first (higher priority for matching user intent)
    if (Array.isArray(profiles)) {
      profiles.forEach((profile) => {
        suggestions.push({
          type: "seller",
          label: profile.name || "Unknown Seller",
          subtitle: "Seller profile",
          url: `/profile/${encodeURIComponent(profile.name || profile.id)}`,
        });
      });
    }

    // Add part suggestions
    if (Array.isArray(listings)) {
      listings.filter((listing) => !isReservationActive(listing.reserved_until)).forEach((listing) => {
        const makeModel = [listing.make, listing.model].filter(Boolean).join(" ");
        suggestions.push({
          type: "part",
          label: listing.title || "Untitled",
          subtitle: makeModel || listing.price || undefined,
          url: `/listing/${listing.id}`,
        });
      });
    }

    return NextResponse.json({ suggestions: suggestions.slice(0, 8) });
  } catch (error) {
    console.error("[search/suggestions] Error:", error);
    return NextResponse.json({ suggestions: [] });
  }
}
