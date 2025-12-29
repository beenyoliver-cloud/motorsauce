import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

async function requireUser(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) return { error: unauthorized() };
    const supabase = supabaseServer({ authHeader });
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) return { error: unauthorized() };
    return { supabase, userId: data.user.id };
  } catch (err) {
    console.error("[garage/vehicles] Auth error", err);
    return { error: unauthorized() };
  }
}

export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if ("error" in auth && auth.error) return auth.error;

  try {
    const { data, error } = await auth.supabase
      .from("garage_vehicles")
      .select("*")
      .eq("user_id", auth.userId)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ vehicles: data || [] });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("Error loading garage vehicles:", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireUser(req);
  if ("error" in auth && auth.error) return auth.error;

  try {
    const body = await req.json();
    const vehicle = { user_id: auth.userId, ...body };

    const { data, error } = await auth.supabase.from("garage_vehicles").insert([vehicle]).select().single();
    if (error) throw error;

    return NextResponse.json({ vehicle: data });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("Error creating vehicle:", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const auth = await requireUser(req);
  if ("error" in auth && auth.error) return auth.error;

  try {
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "Vehicle ID required" }, { status: 400 });
    }

    // Force user scope server-side to avoid spoofing
    const { data, error } = await auth.supabase
      .from("garage_vehicles")
      .update({ ...updates, user_id: auth.userId })
      .eq("id", id)
      .eq("user_id", auth.userId)
      .select()
      .single();
    if (error) throw error;

    return NextResponse.json({ vehicle: data });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("Error updating vehicle:", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireUser(req);
  if ("error" in auth && auth.error) return auth.error;

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Vehicle ID required" }, { status: 400 });
    }

    const { error } = await auth.supabase
      .from("garage_vehicles")
      .delete()
      .eq("id", id)
      .eq("user_id", auth.userId);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("Error deleting vehicle:", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
