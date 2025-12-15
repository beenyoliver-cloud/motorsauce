import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const COOKIE_NAME = "ms_active_car";
const THIRTY_DAYS = 60 * 60 * 24 * 30;

type ActiveCarPayload = {
  id?: string;
  make?: string;
  model?: string;
  year?: number;
  ts?: number;
};

export async function POST(req: Request) {
  try {
    let body: { car?: ActiveCarPayload | null } = {};
    try {
      body = await req.json();
    } catch {
      // ignore malformed body; we'll treat as clear request
    }
    const car = body?.car ?? null;
    const store = await cookies();

    if (!car) {
      store.delete(COOKIE_NAME);
      return NextResponse.json({ ok: true });
    }

    const sanitized = sanitizeCar(car);
    if (!sanitized) {
      store.delete(COOKIE_NAME);
      return NextResponse.json({ ok: true });
    }

    store.set({
      name: COOKIE_NAME,
      value: JSON.stringify(sanitized),
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: THIRTY_DAYS,
      path: "/",
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[garage active] Failed to persist active car", error);
    return NextResponse.json({ error: "Failed to save active car" }, { status: 500 });
  }
}

function sanitizeCar(car: ActiveCarPayload): ActiveCarPayload | null {
  const id = typeof car.id === "string" ? car.id.trim() : "";
  const make = typeof car.make === "string" ? car.make.trim() : "";
  const model = typeof car.model === "string" ? car.model.trim() : "";
  const year = typeof car.year === "number" && Number.isFinite(car.year) ? car.year : undefined;

  const payload: ActiveCarPayload = {};
  if (id) payload.id = id;
  if (make) payload.make = make;
  if (model) payload.model = model;
  if (typeof year === "number" && Number.isFinite(year)) payload.year = year;

  if (!payload.id && !payload.make && !payload.model && payload.year === undefined) {
    return null;
  }

  payload.ts = Date.now();
  return payload;
}
