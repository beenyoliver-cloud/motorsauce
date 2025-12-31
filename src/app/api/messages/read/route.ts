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

// POST /api/messages/read - Mark conversation as read
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

    // Verify conversation and update the correct read column
    const { data: conversation, error: convError } = await supabase
      .from("conversations")
      .select("id, buyer_user_id, seller_user_id")
      .eq("id", threadId)
      .single();

    if (convError || !conversation) {
      console.error("[read API] Conversation not found", convError);
      return NextResponse.json({ error: "Thread not found", threadMissing: true }, { status: 200 });
    }

    const isBuyer = conversation.buyer_user_id === user.id;
    const isSeller = conversation.seller_user_id === user.id;
    if (!isBuyer && !isSeller) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const payload = isBuyer
      ? { buyer_last_read_at: new Date().toISOString() }
      : { seller_last_read_at: new Date().toISOString() };

    const { error: updateError } = await supabase
      .from("conversations")
      .update(payload)
      .eq("id", threadId);

    if (updateError) {
      console.error("[read API] Update error:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
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

    const { data: conversation, error: convError } = await supabase
      .from("conversations")
      .select("id, buyer_user_id, seller_user_id")
      .eq("id", threadId)
      .single();

    if (convError || !conversation) {
      return NextResponse.json({ error: "Thread not found", threadMissing: true }, { status: 200 });
    }

    const isBuyer = conversation.buyer_user_id === user.id;
    const isSeller = conversation.seller_user_id === user.id;
    if (!isBuyer && !isSeller) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const payload = isBuyer
      ? { buyer_last_read_at: null }
      : { seller_last_read_at: null };

    const { error: updateError } = await supabase
      .from("conversations")
      .update(payload)
      .eq("id", threadId);

    if (updateError) {
      console.error("[read API] Update error:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error("[read API] Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
