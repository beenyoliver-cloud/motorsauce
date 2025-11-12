import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const supabase = supabaseServer();

type SellerMetricRow = {
  seller_name: string;
  avatar: string | null;
  clicks: number | null;
  last_clicked: string | null;
};

type ScoredMetric = SellerMetricRow & { score: number };
type ProfileRow = { id: string; name: string };

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
      if (names.length) {
        const { data: profiles, error: pErr } = await supabase
          .from('profiles')
          .select('id, name')
          .in('name', names);
        if (!pErr && Array.isArray(profiles)) {
          const profs = profiles as ProfileRow[];
          idByName = Object.fromEntries(profs.map((p) => [p.name, p.id]));
        }
      }

      const out = scored.slice(0, 12).map(({ score, ...rest }) => ({
        ...rest,
        seller_id: idByName[rest.seller_name] || undefined,
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
