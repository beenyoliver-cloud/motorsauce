// src/app/api/v2/conversations/[conversationId]/messages/route.ts
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

// GET /api/v2/conversations/[conversationId]/messages - Fetch messages
export async function GET(
  req: Request,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const { conversationId } = await params;
    const authHeader = req.headers.get("authorization");
    
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getSupabase(authHeader);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user can access this conversation
    const { data: conversation, error: convError } = await supabase
      .from("conversations")
      .select("buyer_user_id, seller_user_id")
      .eq("id", conversationId)
      .single();

    if (convError || !conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    if (conversation.buyer_user_id !== user.id && conversation.seller_user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch messages
    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get("limit") || 100), 200);
    const before = searchParams.get("before"); // cursor for pagination

    let query = supabase
      .from("messages_v2")
      .select("*")
      .eq("conversation_id", conversationId)
      .is("deleted_at", null)
      .order("created_at", { ascending: true })
      .limit(limit);

    if (before) {
      query = query.lt("created_at", before);
    }

    const { data: messages, error: messagesError } = await query;

    if (messagesError) {
      console.error("[messages] GET error:", messagesError);
      return NextResponse.json({ error: messagesError.message }, { status: 500 });
    }

    // Enrich with sender profiles
    const senderIds = [...new Set(messages?.map(m => m.sender_user_id).filter(Boolean))];
    let profileMap = new Map();
    
    if (senderIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, avatar")
        .in("id", senderIds);
      
      profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
    }

    // Enrich messages with sender info
    const enriched = messages?.map(m => ({
      ...m,
      sender: m.sender_user_id ? profileMap.get(m.sender_user_id) : null,
    }));

    // Update read status
    const isBuyer = conversation.buyer_user_id === user.id;
    const updateField = isBuyer ? "buyer_last_read_at" : "seller_last_read_at";
    
    await supabase
      .from("conversations")
      .update({ [updateField]: new Date().toISOString() })
      .eq("id", conversationId);

    return NextResponse.json({ messages: enriched || [] }, { status: 200 });
  } catch (error: any) {
    console.error("[messages] GET error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/v2/conversations/[conversationId]/messages - Send a message
export async function POST(
  req: Request,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const { conversationId } = await params;
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
    const { type = "TEXT", text, metadata = {} } = body;

    if (!["TEXT", "IMAGE", "SYSTEM"].includes(type)) {
      return NextResponse.json({ error: "Invalid message type" }, { status: 400 });
    }

    if (type === "TEXT" && !text?.trim()) {
      return NextResponse.json({ error: "Text is required for TEXT messages" }, { status: 400 });
    }

    if (text && text.length > 2000) {
      return NextResponse.json({ error: "Message too long (max 2000 characters)" }, { status: 400 });
    }

    // Verify user can access this conversation
    const { data: conversation, error: convError } = await supabase
      .from("conversations")
      .select("*")
      .eq("id", conversationId)
      .single();

    if (convError || !conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    if (conversation.buyer_user_id !== user.id && conversation.seller_user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (conversation.status !== "ACTIVE") {
      return NextResponse.json({ error: "Conversation is not active" }, { status: 400 });
    }

    // Create message
    const { data: message, error: messageError } = await supabase
      .from("messages_v2")
      .insert({
        conversation_id: conversationId,
        sender_user_id: user.id,
        type,
        body: text?.trim() || null,
        metadata,
      })
      .select()
      .single();

    if (messageError) {
      console.error("[messages] POST error:", messageError);
      return NextResponse.json({ error: messageError.message }, { status: 500 });
    }

    // Fetch sender profile for response
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, name, avatar")
      .eq("id", user.id)
      .single();

    return NextResponse.json({
      message: {
        ...message,
        sender: profile,
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error("[messages] POST error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
