import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const supabase = supabaseServer();

// GET /api/users?q=term&limit=20
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || searchParams.get("query") || "").trim();
  const limit = Number(searchParams.get("limit") || 20);

  if (!q) {
    return NextResponse.json([], { status: 200 });
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, name, avatar, rating")
    .ilike("name", `%${q}%`)
    .order("name", { ascending: true })
    .limit(Number.isFinite(limit) ? limit : 20);

  if (error) {
    console.error("DB error searching users", error);
    return NextResponse.json({ error: "Failed to search users" }, { status: 500 });
  }

  const rows = Array.isArray(data) ? data : [];
  return NextResponse.json(
    rows.map((r) => ({
      id: r.id,
      name: r.name || "",
      avatar: r.avatar || "/images/seller1.jpg",
      rating: typeof (r as any).rating === "number" ? (r as any).rating : 5,
      url: `/profile/${encodeURIComponent(r.name || "")}`,
    })),
    { status: 200 }
  );
}
