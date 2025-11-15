import { NextResponse } from "next/server";
import { supabase as supabaseServerAnon } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

// Use anon key client to keep RLS in effect
const supabase = supabaseServerAnon;

function sameOriginOk(req: Request) {
  try {
    const origin = req.headers.get("origin") || "";
    const referer = req.headers.get("referer") || "";
    const base = process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
    if (!base) return false;
    return origin.startsWith(base) || referer.startsWith(base);
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  if (!sameOriginOk(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const body = await req.json().catch(() => ({}));
    const name = String(body?.name || "").trim();
    const avatar = body?.avatar || null;
    if (!name) return NextResponse.json({ error: "missing name" }, { status: 400 });

    // Check existing
    const { data: existing, error: selError } = await supabase
      .from("seller_metrics")
      .select("clicks")
      .eq("seller_name", name)
      .maybeSingle();

    if (selError) {
      console.error("seller_metrics select error", selError);
    }

    if (existing && typeof existing.clicks === "number") {
      const newClicks = existing.clicks + 1;
      const { error: upError } = await supabase
        .from("seller_metrics")
        .update({ clicks: newClicks, avatar, last_clicked: new Date().toISOString() })
        .eq("seller_name", name);
      if (upError) {
        console.error("seller_metrics update error", upError);
        return NextResponse.json({ error: upError.message }, { status: 500 });
      }
      return NextResponse.json({ seller_name: name, clicks: newClicks });
    }

    // Insert new
    const { error: insError } = await supabase.from("seller_metrics").insert({
      seller_name: name,
      avatar: avatar ?? undefined,
      clicks: 1,
      last_clicked: new Date().toISOString(),
    });
    if (insError) {
      console.error("seller_metrics insert error", insError);
      return NextResponse.json({ error: insError.message }, { status: 500 });
    }
    return NextResponse.json({ seller_name: name, clicks: 1 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "unexpected" }, { status: 500 });
  }
}
