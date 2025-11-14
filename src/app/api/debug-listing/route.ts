import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function mapError(e: any) {
  if (!e) return null;
  return {
    message: e.message,
    details: e.details,
    hint: e.hint,
    code: e.code,
  };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const report: any = { id, steps: {}, note: "This endpoint outputs JSON; if you see HTML you hit a notFound or routing fallback." };

  try {
    // Step 1: call single-item API (absolute URL to avoid internal resolution issues)
    try {
      const singleUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://'+process.env.VERCEL_URL || ''}/api/listings?id=${encodeURIComponent(id)}`;
      const res = await fetch(singleUrl, { cache: "no-store" });
      report.steps.singleApi = {
        ok: res.ok,
        status: res.status,
        url: singleUrl,
      };
      if (!res.ok) {
        report.steps.singleApi.body = await res.text();
      } else {
        const json = await res.json();
        report.steps.singleApi.body = { id: json?.id, title: json?.title };
      }
    } catch (e) {
      report.steps.singleApi = { error: String(e) };
    }

    // Step 2: call list API and check presence
    try {
      const listUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://'+process.env.VERCEL_URL || ''}/api/listings?limit=200`;
      const res = await fetch(listUrl, { cache: "no-store" });
      report.steps.listApi = { ok: res.ok, status: res.status, url: listUrl };
      if (res.ok) {
        const arr = (await res.json()) as any[];
        const found = Array.isArray(arr) ? arr.find((x) => String(x?.id) === String(id)) : undefined;
        report.steps.listApi.count = Array.isArray(arr) ? arr.length : null;
        report.steps.listApi.found = !!found;
        if (found) report.steps.listApi.sample = { id: found.id, title: found.title };
      } else {
        report.steps.listApi.body = await res.text();
      }
    } catch (e) {
      report.steps.listApi = { error: String(e) };
    }

    // Step 3: Supabase direct
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
      if (!url || !key) {
        report.steps.supabase = { error: "Missing Supabase env" };
      } else {
        const supabase = createClient(url, key, { auth: { persistSession: false } });
        const eq = await supabase.from("listings").select("*").eq("id", id).maybeSingle();
        report.steps.supabase = {
          eqOk: !eq.error,
          eqError: mapError(eq.error),
          eqFound: !!eq.data,
          eqSample: eq.data ? { id: (eq.data as any).id, title: (eq.data as any).title } : null,
        };
        if (!eq.data) {
          const all = await supabase.from("listings").select("*").limit(200);
          const found = (all.data || []).find((x: any) => String(x.id) === String(id));
          report.steps.supabase.list = {
            ok: !all.error,
            error: mapError(all.error),
            count: all.data?.length ?? null,
            found: !!found,
            sample: found ? { id: found.id, title: found.title } : null,
          };
        }
      }
    } catch (e) {
      report.steps.supabase = { error: String(e) };
    }

    return NextResponse.json(report, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e), report }, { status: 500 });
  }
}
