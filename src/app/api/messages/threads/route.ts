// src/app/api/messages/threads/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Server-only client (respects RLS with authenticated user context)
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

type ThreadRow = {
  id: string;
  participant_1_id: string;
  participant_2_id: string;
  listing_ref: string | null;
  last_message_text: string | null;
  last_message_at: string;
  created_at: string;
  updated_at: string;
};

type ProfileRow = {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
};

// GET /api/messages/threads - List all threads for the authenticated user
export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getSupabase(authHeader);

    // Verify auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch threads (RLS will filter to only user's threads)
    const { data: threads, error: threadsError } = await supabase
      .from("threads")
      .select("*")
      .order("last_message_at", { ascending: false });

    if (threadsError) {
      console.error("[threads API] Error fetching threads:", threadsError);
      return NextResponse.json({ error: threadsError.message }, { status: 500 });
    }

    if (!threads || threads.length === 0) {
      return NextResponse.json({ threads: [] }, { status: 200 });
    }

    // Enrich with peer profile data and read status
    const participantIds = new Set<string>();
    threads.forEach((t: ThreadRow) => {
      if (t.participant_1_id !== user.id) participantIds.add(t.participant_1_id);
      if (t.participant_2_id !== user.id) participantIds.add(t.participant_2_id);
    });

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, name, email, avatar")
      .in("id", Array.from(participantIds));

    const profileMap = new Map<string, ProfileRow>();
    (profiles || []).forEach((p: ProfileRow) => profileMap.set(p.id, p));

    // Fetch read status
    const { data: readStatus } = await supabase
      .from("thread_read_status")
      .select("thread_id")
      .eq("user_id", user.id);

    const readSet = new Set((readStatus || []).map((r: { thread_id: string }) => r.thread_id));

    // Build response
    const enriched = threads.map((t: ThreadRow) => {
      const peerId = t.participant_1_id === user.id ? t.participant_2_id : t.participant_1_id;
      const peer = profileMap.get(peerId);

      return {
        id: t.id,
        peer: {
          id: peerId,
          name: peer?.name || "Unknown",
          email: peer?.email,
          avatar: peer?.avatar,
        },
        listingRef: t.listing_ref,
        lastMessage: t.last_message_text,
        lastMessageAt: t.last_message_at,
        isRead: readSet.has(t.id),
        createdAt: t.created_at,
      };
    });

    return NextResponse.json({ threads: enriched }, { status: 200 });
  } catch (error: any) {
    console.error("[threads API] Unexpected error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

// POST /api/messages/threads - Create or get existing thread
export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      console.error("[threads API POST] No authorization header");
      return NextResponse.json({ error: "Unauthorized - No auth header" }, { status: 401 });
    }

    const supabase = getSupabase(authHeader);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error("[threads API POST] Auth error:", authError);
      return NextResponse.json({ error: "Unauthorized - Invalid token" }, { status: 401 });
    }

    console.log("[threads API POST] Authenticated user:", user.id);

    const body = await req.json();
    const { peerId, listingRef } = body;

    console.log("[threads API POST] Request body:", { peerId, listingRef });

    if (!peerId) {
      console.error("[threads API POST] Missing peerId");
      return NextResponse.json({ error: "peerId is required" }, { status: 400 });
    }

    if (peerId === user.id) {
      console.error("[threads API POST] User trying to message themselves");
      return NextResponse.json({ error: "Cannot create thread with yourself" }, { status: 400 });
    }

    // Participants ordered by UUID for consistency
    const [p1, p2] = [user.id, peerId].sort();
    console.log("[threads API POST] Creating thread with participants:", { p1, p2, listingRef });

    // Upsert thread using composite unique key (participant_1_id, participant_2_id, listing_ref)
    const { data: thread, error: upsertError } = await supabase
      .from("threads")
      .upsert(
        {
          participant_1_id: p1,
          participant_2_id: p2,
          listing_ref: listingRef || null,
          last_message_text: "New conversation",
          last_message_at: new Date().toISOString(),
        },
        { onConflict: "participant_1_id,participant_2_id,listing_ref" }
      )
      .select()
      .single();

    if (upsertError) {
      console.error("[threads API POST] Error upserting thread:", {
        error: upsertError,
        code: upsertError.code,
        message: upsertError.message,
        details: upsertError.details,
        hint: upsertError.hint,
      });
      return NextResponse.json({ 
        error: `Failed to create thread: ${upsertError.message}`,
        details: upsertError.details,
        hint: upsertError.hint,
      }, { status: 500 });
    }

    console.log("[threads API POST] Thread created successfully:", thread);
    return NextResponse.json({ thread }, { status: 200 });
  } catch (error: any) {
    console.error("[threads API] POST error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
