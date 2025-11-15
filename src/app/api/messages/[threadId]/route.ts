// src/app/api/messages/[threadId]/route.ts
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

// GET /api/messages/[threadId] - Fetch all messages in a thread
export async function GET(
  req: Request,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const { threadId } = await params;
    const authHeader = req.headers.get("authorization");
    
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getSupabase(authHeader);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user has access to this thread
    const { data: thread, error: threadError } = await supabase
      .from("threads")
      .select("*")
      .eq("id", threadId)
      .single();

    if (threadError || !thread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    // Fetch messages (RLS will enforce access control)
    const { data: messages, error: messagesError } = await supabase
      .from("messages")
      .select("*")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true });

    if (messagesError) {
      console.error("[messages API] Error fetching messages:", messagesError);
      return NextResponse.json({ error: messagesError.message }, { status: 500 });
    }

    // Fetch profiles for message senders
    const senderIds = [...new Set(messages?.map((m: any) => m.from_user_id) || [])];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, name, avatar")
      .in("id", senderIds);

    const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

    // Enrich messages
    const enriched = (messages || []).map((m: any) => {
      const sender = profileMap.get(m.from_user_id);
      return {
        id: m.id,
        threadId: m.thread_id,
        from: {
          id: m.from_user_id,
          name: sender?.name || "Unknown",
          avatar: sender?.avatar,
        },
        type: m.message_type,
        text: m.text_content,
        offer: m.message_type === "offer" ? {
          id: m.offer_id,
          amountCents: m.offer_amount_cents,
          currency: m.offer_currency,
          status: m.offer_status,
        } : undefined,
        createdAt: m.created_at,
        updatedAt: m.updated_at,
      };
    });

    return NextResponse.json({ messages: enriched }, { status: 200 });
  } catch (error: any) {
    console.error("[messages API] GET error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

// POST /api/messages/[threadId] - Send a message to a thread
export async function POST(
  req: Request,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const { threadId } = await params;
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
    const { type = "text", text, offerId, offerAmountCents, offerCurrency, offerStatus } = body;

    if (!["text", "offer", "system"].includes(type)) {
      return NextResponse.json({ error: "Invalid message type" }, { status: 400 });
    }

    if (type === "text" && !text?.trim()) {
      return NextResponse.json({ error: "Text is required for text messages" }, { status: 400 });
    }

    if (type === "offer" && (!offerId || !offerAmountCents)) {
      return NextResponse.json({ error: "Offer details required for offer messages" }, { status: 400 });
    }

    // Verify thread access
    const { data: thread, error: threadError } = await supabase
      .from("threads")
      .select("*")
      .eq("id", threadId)
      .single();

    if (threadError || !thread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    // Insert message
    const { data: message, error: insertError } = await supabase
      .from("messages")
      .insert({
        thread_id: threadId,
        from_user_id: user.id,
        message_type: type,
        text_content: type === "system" || type === "text" ? text : null,
        offer_id: type === "offer" ? offerId : null,
        offer_amount_cents: type === "offer" ? offerAmountCents : null,
        offer_currency: type === "offer" ? (offerCurrency || "GBP") : null,
        offer_status: type === "offer" ? offerStatus : null,
      })
      .select()
      .single();

    if (insertError) {
      console.error("[messages API] Insert error:", insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ message }, { status: 201 });
  } catch (error: any) {
    console.error("[messages API] POST error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/messages/[threadId] - Soft-delete thread for current user
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const { threadId } = await params;
    const authHeader = req.headers.get("authorization");
    
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getSupabase(authHeader);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify thread exists and user has access
    const { data: thread, error: threadError } = await supabase
      .from("threads")
      .select("*")
      .eq("id", threadId)
      .single();

    if (threadError || !thread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    // Insert/update deletion record
    const { error: deleteError } = await supabase
      .from("thread_deletions")
      .upsert(
        {
          thread_id: threadId,
          user_id: user.id,
          deleted_at: new Date().toISOString(),
        },
        { onConflict: "thread_id,user_id" }
      );

    if (deleteError) {
      console.error("[messages API] Delete error:", deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error("[messages API] DELETE error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
