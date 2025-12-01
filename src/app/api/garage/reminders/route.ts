import { NextRequest, NextResponse } from "next/server";

// Temporary in-memory store until DB migration is applied
const memoryStore: Array<{
  id: string;
  userId: string;
  vehicleId: string;
  type: "mot" | "insurance" | "service";
  scheduledFor: string; // ISO
  createdAt: string;
}> = [];

const genId = () => Math.random().toString(36).slice(2);

export async function GET(req: NextRequest) {
  try {
    // In production, replace with DB query filtering by current user
    return NextResponse.json({ reminders: memoryStore });
  } catch (e) {
    return NextResponse.json({ error: "Failed to load reminders" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, vehicleId, type, scheduledFor } = body || {};
    if (!userId || !vehicleId || !type || !scheduledFor) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }
    if (!["mot", "insurance", "service"].includes(type)) {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    const rec = {
      id: genId(),
      userId: String(userId),
      vehicleId: String(vehicleId),
      type: type as "mot" | "insurance" | "service",
      scheduledFor: String(scheduledFor),
      createdAt: new Date().toISOString(),
    };
    memoryStore.push(rec);

    return NextResponse.json({ ok: true, reminder: rec });
  } catch (e) {
    return NextResponse.json({ error: "Failed to create reminder" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const idx = memoryStore.findIndex((r) => r.id === id);
    if (idx >= 0) memoryStore.splice(idx, 1);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: "Failed to delete reminder" }, { status: 500 });
  }
}
