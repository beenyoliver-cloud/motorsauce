// src/app/api/messages/read/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getSupabase(authHeader?: string | null) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  
  const client = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: authHeader ? { Authorization: authHeader } : {},
    },
  });
  
  return client;
}

// POST /api/messages/read - Mark thread as read
export async function POST(req: Request) {
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

    const body = await req.json();
    const { threadId } = body;

    if (!threadId) {
      return NextResponse.json({ error: "threadId is required" }, { status: 400 });
    }

    // Upsert read status
    console.log(`[read API] Marking thread ${threadId} as read for user ${user.id}`);
    const { error: upsertError } = await supabase
      .from("thread_read_status")
      .upsert(
        {
          thread_id: threadId,
          user_id: user.id,
          last_read_at: new Date().toISOString(),
        },
        { onConflict: "thread_id,user_id" }
      );

    if (upsertError) {
      console.error("[read API] Upsert error:", upsertError);
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    console.log(`[read API] Successfully marked thread ${threadId} as read`);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error("[read API] Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/messages/read - Mark thread as unread (eBay-style)
export async function DELETE(req: Request) {
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

    const body = await req.json();
    const { threadId } = body;

    if (!threadId) {
      return NextResponse.json({ error: "threadId is required" }, { status: 400 });
    }

    // Delete read status to mark as unread
    const { error: deleteError } = await supabase
      .from("thread_read_status")
      .delete()
      .match({ thread_id: threadId, user_id: user.id });

    if (deleteError) {
      console.error("[read API] Delete error:", deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error("[read API] Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
