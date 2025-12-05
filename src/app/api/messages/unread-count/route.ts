// src/app/api/messages/unread-count/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getSupabase(authHeader?: string | null) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: authHeader ? { Authorization: authHeader } : {} },
  });
}

// GET /api/messages/unread-count - Number of threads with at least one message and not marked read
export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getSupabase(authHeader);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch threads where user is a participant (either participant_1 or participant_2)
    const { data: threads, error: threadsError } = await supabase
      .from("threads")
      .select("id, last_message_at, created_at")
      .or(`participant_1_id.eq.${user.id},participant_2_id.eq.${user.id}`)
      .order("last_message_at", { ascending: false });

    if (threadsError) {
      console.error("[unread-count] threads error:", threadsError);
      return NextResponse.json({ error: threadsError.message }, { status: 500 });
    }

    if (!threads || threads.length === 0) {
      return NextResponse.json({ count: 0 }, { status: 200 });
    }

    // Read status for current user
    const { data: readRows, error: readError } = await supabase
      .from("thread_read_status")
      .select("thread_id")
      .eq("user_id", user.id);

    if (readError) {
      console.warn("[unread-count] read status error:", readError);
    }

    const readSet = new Set((readRows || []).map((r: any) => r.thread_id));
    const count = (threads || []).reduce((acc, t: any) => {
      // Only count threads that have at least a created_at/last_message_at (defensive)
      const hasAny = Boolean(t.last_message_at || t.created_at);
      const isRead = readSet.has(t.id);
      return acc + (hasAny && !isRead ? 1 : 0);
    }, 0);

    console.log(`[unread-count] User ${user.id}: ${threads?.length} participating threads, ${readSet.size} marked read, ${count} unread`);
    return NextResponse.json({ count }, { status: 200 });
  } catch (error: any) {
    console.error("[unread-count] Unexpected error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
