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

// Simple in-memory cache with 5-second TTL to reduce database load
const cache = new Map<string, { count: number; timestamp: number }>();
const CACHE_TTL = 5000; // 5 seconds

function getCachedCount(userId: string): number | null {
  const cached = cache.get(userId);
  if (!cached) return null;
  
  const age = Date.now() - cached.timestamp;
  if (age > CACHE_TTL) {
    cache.delete(userId);
    return null;
  }
  
  return cached.count;
}

function setCachedCount(userId: string, count: number): void {
  cache.set(userId, { count, timestamp: Date.now() });
  
  // Cleanup old entries (keep cache size reasonable)
  if (cache.size > 1000) {
    const now = Date.now();
    for (const [key, value] of cache.entries()) {
      if (now - value.timestamp > CACHE_TTL) {
        cache.delete(key);
      }
    }
  }
}

// GET /api/messages/unread-count - Number of conversations with unread messages (bridge to new schema)
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

    // Check cache first
    const cachedCount = getCachedCount(user.id);
    if (cachedCount !== null) {
      console.log(`[unread-count] Cache HIT for user ${user.id}: ${cachedCount}`);
      return NextResponse.json({ count: cachedCount }, { status: 200 });
    }

    // Fetch conversations; RLS will scope to participants
    const { data: conversations, error: convError } = await supabase
      .from("conversations")
      .select("id, buyer_user_id, seller_user_id, last_message_at, buyer_last_read_at, seller_last_read_at, created_at")
      .order("last_message_at", { ascending: false });

    if (convError) {
      console.error("[unread-count] conversations error:", convError);
      return NextResponse.json({ error: convError.message }, { status: 500 });
    }

    if (!conversations || conversations.length === 0) {
      setCachedCount(user.id, 0);
      return NextResponse.json({ count: 0 }, { status: 200 });
    }

    const count = (conversations || []).reduce((acc, c: any) => {
      const lastMessageAt = c.last_message_at || c.created_at;
      if (!lastMessageAt) return acc;
      const lastRead = c.buyer_user_id === user.id ? c.buyer_last_read_at : c.seller_last_read_at;
      const isRead = lastRead ? new Date(lastRead).getTime() >= new Date(lastMessageAt).getTime() : false;
      return acc + (isRead ? 0 : 1);
    }, 0);

    // Cache the result
    setCachedCount(user.id, count);

    console.log(`[unread-count] User ${user.id}: ${conversations?.length} conversations, ${count} unread (cached)`);
    return NextResponse.json({ count }, { status: 200 });
  } catch (error: any) {
    console.error("[unread-count] Unexpected error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
