import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const message = typeof body.message === "string" ? body.message.trim() : "";

    if (!email || !message) {
      return NextResponse.json({ error: "Email and message are required" }, { status: 400 });
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;
    if (!serviceKey || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { error } = await supabase.from("contact_messages").insert({
      email,
      message,
    });

    if (error) {
      console.error("[contact] Failed to store message:", error);
      return NextResponse.json({ error: "Failed to submit message" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("[contact] Unexpected error:", error);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
