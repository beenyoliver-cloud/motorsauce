import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = (searchParams.get("q") || "").trim();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return NextResponse.json({ sellers: [] });
  }

  try {
    const supabase = createClient(url, key, {
      auth: { persistSession: false },
    });

    // If no query, return top 50 profiles by name; otherwise search
    let profilesQuery = supabase
      .from("profiles")
      .select("id, name, avatar")
      .order("name", { ascending: true })
      .limit(50);

    if (query && query.length >= 1) {
      profilesQuery = supabase
        .from("profiles")
        .select("id, name, avatar")
        .ilike("name", `%${query}%`)
        .limit(20);
    }

    const { data: profiles, error } = await profilesQuery;

    if (error) {
      console.error("[search/sellers] Error:", error);
      return NextResponse.json({ sellers: [] });
    }

    // Count listings per seller
    const sellersWithCounts = await Promise.all(
      (profiles || []).map(async (profile) => {
        const { count } = await supabase
          .from("listings")
          .select("*", { count: "exact", head: true })
          .eq("seller_id", profile.id);

        return {
          id: profile.id,
          name: profile.name || "Unknown",
          avatar: profile.avatar || undefined,
          rating: 5,
          listingsCount: count || 0,
        };
      })
    );

    return NextResponse.json({ sellers: sellersWithCounts });
  } catch (error) {
    console.error("[search/sellers] Error:", error);
    return NextResponse.json({ sellers: [] });
  }
}
