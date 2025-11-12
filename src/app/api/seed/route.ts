import { NextResponse } from "next/server";

// Seed endpoint intentionally disabled in this repository state.
// We keep the route to avoid 404s during deploys, but it no longer imports local sample data.
export async function POST() {
  return NextResponse.json({ error: "seeding disabled" }, { status: 410 });
}
