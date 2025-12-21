import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function POST(request: NextRequest) {
  try {
    const { eventType, payload, at } = await request.json();
    if (!eventType || typeof eventType !== "string") {
      return NextResponse.json({ error: "Missing eventType" }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      console.info("[telemetry]", eventType, payload);
      return NextResponse.json({ ok: true });
    }

    const { error } = await supabaseAdmin.from("telemetry_events").insert({
      event_type: eventType,
      payload: payload ?? null,
      recorded_at: at ? new Date(at).toISOString() : new Date().toISOString(),
    });
    if (error) {
      console.warn("[telemetry] insert failed", error);
      return NextResponse.json({ error: "Failed to record telemetry" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[telemetry] unexpected error", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
