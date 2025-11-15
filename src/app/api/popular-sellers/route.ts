import { NextResponse } from "next/server";
import { supabase as supabaseServerAnon } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

// Use anon key server client to respect RLS
const supabase = supabaseServerAnon;

type SellerMetricRow = {
  seller_name: string;
  avatar: string | null;
  clicks: number | null;
  last_clicked: string | null;
};

type ScoredMetric = SellerMetricRow & { score: number };
type ProfileRow = { id: string; name: string; sold_count?: number | null; sales_count?: number | null };

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("seller_metrics")
      .select("seller_name, avatar, clicks, last_clicked")
      .limit(200);

    if (error) {
      console.error("Popular sellers query error", error);
      throw error;
    }

    if (Array.isArray(data) && data.length) {
      // Recency-weighted score with half-life decay (default 7 days)
      const HALF_LIFE_DAYS = 7;
      const now = Date.now();
      const rows = (data as SellerMetricRow[]) || [];
      const scored: ScoredMetric[] = rows.map((row) => {
        const clicks = Number(row.clicks ?? 0);
        const last = row.last_clicked ? new Date(row.last_clicked).getTime() : 0;
        const ageDays = last ? Math.max(0, (now - last) / 86_400_000) : 365; // treat missing as old
        const decay = Math.pow(0.5, ageDays / HALF_LIFE_DAYS);
        const score = clicks * decay;
        return { ...row, score };
      });
      scored.sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || (b.clicks ?? 0) - (a.clicks ?? 0));

      // Enrich with profile IDs by matching on name
      const top = scored.slice(0, 50); // fetch a bit more for enrichment
      const names = top.map((r) => r.seller_name).filter(Boolean);
      let idByName: Record<string, string> = {};
      let soldByName: Record<string, number> | undefined;
      if (names.length) {
        // Try to read potential sold count columns if present; ignore if missing
        let profs: ProfileRow[] | null = null;
        try {
          const { data: p1, error: e1 } = await supabase.from('profiles').select('id, name, sold_count, sales_count').in('name', names);
          if (!e1 && Array.isArray(p1)) profs = p1 as ProfileRow[];
        } catch {}
        if (!profs) {
          const { data: p2 } = await supabase.from('profiles').select('id, name').in('name', names);
          if (Array.isArray(p2)) profs = p2 as ProfileRow[];
        }
        if (profs) {
          idByName = Object.fromEntries(profs.map((p) => [p.name, p.id]));
          soldByName = Object.fromEntries(profs.map((p) => [p.name, Number(p.sold_count || p.sales_count || 0)]));
        }
      }

      const out = scored.slice(0, 12).map((s) => ({
        seller_name: s.seller_name,
        avatar: s.avatar,
        clicks: s.clicks,
        last_clicked: s.last_clicked,
        seller_id: idByName[s.seller_name] || undefined,
        sold_count: soldByName?.[s.seller_name] ?? 0,
        // rating can be added later from profiles if present; default handled client-side
      }));
      return NextResponse.json(out);
    }

    // No data: return empty array (we removed the local/sample fallback)
    return NextResponse.json([], { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json([], { status: 200 });
  }
}
