import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type ReminderType = "mot" | "insurance" | "service";
type Reminder = {
  id: string;
  userId: string;
  vehicleId: string;
  type: ReminderType;
  scheduledFor: string;
  createdAt: string;
};

// Prefer Supabase persistence; fall back to per-user memory store if the table is missing.
let supabaseUnavailable = false;
const memoryStore = new Map<string, Reminder[]>();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE || "";

function genId() {
  return Math.random().toString(36).slice(2);
}

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

async function requireUser(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) return { error: unauthorized() };
    const supabase = createClient(supabaseUrl, supabaseServiceKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: authHeader } },
    });
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) return { error: unauthorized() };
    return { userId: data.user.id };
  } catch (err) {
    console.error("[garage/reminders] Auth error", err);
    return { error: unauthorized() };
  }
}

function reminderToResponse(r: any): Reminder {
  return {
    id: r.id,
    userId: r.user_id || r.userId,
    vehicleId: r.vehicle_id || r.vehicleId,
    type: r.type,
    scheduledFor: r.scheduled_for || r.scheduledFor,
    createdAt: r.created_at || r.createdAt || new Date().toISOString(),
  };
}

function shouldUseMemoryStore() {
  return supabaseUnavailable || !supabaseUrl || (!supabaseServiceKey && !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

async function listReminders(userId: string): Promise<Reminder[]> {
  if (shouldUseMemoryStore()) {
    return memoryStore.get(userId) || [];
  }
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await supabase
      .from("garage_reminders")
      .select("id, user_id, vehicle_id, type, scheduled_for, created_at")
      .eq("user_id", userId)
      .order("scheduled_for", { ascending: true });
    if (error) {
      if (error.code === "42P01" || /does not exist/i.test(error.message)) {
        supabaseUnavailable = true;
        return memoryStore.get(userId) || [];
      }
      throw error;
    }
    return (data || []).map(reminderToResponse);
  } catch (err) {
    console.error("[garage/reminders] List error", err);
    supabaseUnavailable = true;
    return memoryStore.get(userId) || [];
  }
}

async function insertReminder(reminder: Reminder): Promise<Reminder> {
  if (shouldUseMemoryStore()) {
    const list = memoryStore.get(reminder.userId) || [];
    list.push(reminder);
    memoryStore.set(reminder.userId, list);
    return reminder;
  }
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await supabase
      .from("garage_reminders")
      .insert({
        id: reminder.id,
        user_id: reminder.userId,
        vehicle_id: reminder.vehicleId,
        type: reminder.type,
        scheduled_for: reminder.scheduledFor,
        created_at: reminder.createdAt,
      })
      .select("id, user_id, vehicle_id, type, scheduled_for, created_at")
      .single();
    if (error) {
      if (error.code === "42P01" || /does not exist/i.test(error.message)) {
        supabaseUnavailable = true;
        return insertReminder(reminder);
      }
      throw error;
    }
    return reminderToResponse(data);
  } catch (err) {
    console.error("[garage/reminders] Insert error", err);
    supabaseUnavailable = true;
    return insertReminder(reminder);
  }
}

async function removeReminder(id: string, userId: string): Promise<void> {
  if (shouldUseMemoryStore()) {
    const list = memoryStore.get(userId) || [];
    memoryStore.set(
      userId,
      list.filter((r) => r.id !== id)
    );
    return;
  }
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await supabase.from("garage_reminders").delete().eq("id", id).eq("user_id", userId);
    if (error) {
      if (error.code === "42P01" || /does not exist/i.test(error.message)) {
        supabaseUnavailable = true;
        return removeReminder(id, userId);
      }
      throw error;
    }
  } catch (err) {
    console.error("[garage/reminders] Delete error", err);
    supabaseUnavailable = true;
    return removeReminder(id, userId);
  }
}

export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if ("error" in auth && auth.error) return auth.error;

  try {
    const reminders = await listReminders(auth.userId);
    return NextResponse.json({ reminders });
  } catch (e) {
    return NextResponse.json({ error: "Failed to load reminders" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireUser(req);
  if ("error" in auth && auth.error) return auth.error;

  try {
    const body = await req.json();
    const { vehicleId, type, scheduledFor } = body || {};

    if (!vehicleId || !type || !scheduledFor) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }
    if (!["mot", "insurance", "service"].includes(type)) {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    const reminder: Reminder = {
      id: genId(),
      userId: auth.userId,
      vehicleId: String(vehicleId),
      type: type as ReminderType,
      scheduledFor: String(scheduledFor),
      createdAt: new Date().toISOString(),
    };

    const stored = await insertReminder(reminder);

    return NextResponse.json({ ok: true, reminder: stored });
  } catch (e) {
    return NextResponse.json({ error: "Failed to create reminder" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireUser(req);
  if ("error" in auth && auth.error) return auth.error;

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    await removeReminder(id, auth.userId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: "Failed to delete reminder" }, { status: 500 });
  }
}
