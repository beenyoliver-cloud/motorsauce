import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { finalizeCheckoutSession } from "@/lib/checkoutServer";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Payments not configured" }, { status: 503 });
  }

  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = supabaseServer({ authHeader });
  const { data: userResult, error: authError } = await supabase.auth.getUser();
  if (authError || !userResult?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = userResult.user;

  const { session_id: sessionId } = await req.json().catch(() => ({ session_id: null }));
  if (!sessionId || typeof sessionId !== "string") {
    return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
  }

  const result = await finalizeCheckoutSession({
    sessionId,
    expectedUserId: user.id,
    includeAddress: true,
  });

  switch (result.state) {
    case "ok":
      return NextResponse.json({ ...result.summary, reused: result.reused });
    case "forbidden":
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    case "not_found":
      return NextResponse.json({ error: "Checkout session not found" }, { status: 404 });
    case "not_paid":
      return NextResponse.json({ error: "Payment not completed yet" }, { status: 409 });
    case "processing":
      return NextResponse.json(
        { error: "Checkout processing", retryAfterMs: result.retryAfterMs },
        { status: 202 }
      );
    case "error":
    default:
      return NextResponse.json({ error: result.error || "Failed to finalize checkout" }, { status: 500 });
  }
}
