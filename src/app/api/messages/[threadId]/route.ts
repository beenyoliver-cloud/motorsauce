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
    const senderIds = [...new Set((messages || []).map((m: any) => m.from_user_id || m.sender) || [])];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, name, avatar")
      .in("id", senderIds);

    const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

    // Fetch offers for messages that reference offers
    const offerIds = (messages || [])
      .filter((m: any) => m.offer_id)
      .map((m: any) => m.offer_id);
    
    let offerMap = new Map();
    if (offerIds.length > 0) {
      const { data: offers } = await supabase
        .from("offers")
        .select("id, listing_title, listing_image")
        .in("id", offerIds);
      
      offerMap = new Map((offers || []).map((o: any) => [o.id, o]));
    }

    // Enrich messages
    const enriched = (messages || []).map((m: any) => {
      const senderId = m.from_user_id || m.sender;
      const sender = profileMap.get(senderId);
      const offer = m.offer_id ? offerMap.get(m.offer_id) : null;
      
      return {
        id: m.id,
        threadId: m.thread_id,
        from: {
          id: senderId,
          name: sender?.name || "Unknown",
          avatar: sender?.avatar,
        },
        type: m.message_type || m.type || "text",
        text: m.text_content || m.text,
        offer: m.message_type === "offer" ? {
          id: m.offer_id,
          amountCents: m.offer_amount_cents,
          currency: m.offer_currency,
          status: m.offer_status,
          listingTitle: offer?.listing_title,
          listingImage: offer?.listing_image,
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

    // Attempt insert using new schema (from_user_id). Also include legacy columns to satisfy NOT NULL if present.
    let insert = await supabase
      .from("messages")
      .insert({
        thread_id: threadId,
        from_user_id: user.id,
        sender: user.id, // legacy support; ignored if column doesn't exist
        message_type: type,
        text_content: type === "system" || type === "text" ? text : null,
        content: type === "system" || type === "text" ? text : null, // legacy content column
        offer_id: type === "offer" ? offerId : null,
        offer_amount_cents: type === "offer" ? offerAmountCents : null,
        offer_currency: type === "offer" ? (offerCurrency || "GBP") : null,
        offer_status: type === "offer" ? offerStatus : null,
      })
      .select()
      .single();

    if (insert.error) {
      // Fall back if 'from_user_id' or 'text_content' columns not found (legacy schema 42703) by using simpler legacy column names
      if (insert.error.code === "42703") {
        console.warn("[messages API] Falling back to legacy message schema", insert.error.details || insert.error.message);
        insert = await supabase
          .from("messages")
          .insert({
            thread_id: threadId,
            sender: user.id,
            message_type: type,
            content: type === "system" || type === "text" ? text : null,
            offer_id: type === "offer" ? offerId : null,
            offer_amount_cents: type === "offer" ? offerAmountCents : null,
            offer_currency: type === "offer" ? (offerCurrency || "GBP") : null,
            offer_status: type === "offer" ? offerStatus : null,
          })
          .select()
          .single();
      }
    }

    if (insert.error) {
      console.error("[messages API] Insert error after fallback:", insert.error);
      return NextResponse.json({ error: insert.error.message }, { status: 500 });
    }
    const message = insert.data;

    // If the sender had previously soft-deleted this thread, "undelete" it now that they sent a message
    const { error: undeleteError } = await supabase
      .from("thread_deletions")
      .delete()
      .eq("thread_id", threadId)
      .eq("user_id", user.id);
    if (undeleteError) {
      console.warn("[messages API] Failed to remove deletion marker on send:", undeleteError);
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
