// src/app/api/v2/conversations/unread/route.ts
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

// GET /api/v2/conversations/unread - Count unread conversations
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

    // Count conversations where last_message_at is after user's last_read_at
    const { data: conversations, error: convError } = await supabase
      .from("conversations")
      .select("id, buyer_user_id, seller_user_id, last_message_at, buyer_last_read_at, seller_last_read_at")
      .or(`buyer_user_id.eq.${user.id},seller_user_id.eq.${user.id}`)
      .eq("status", "ACTIVE");

    if (convError) {
      console.error("[unread] Error fetching conversations:", convError);
      return NextResponse.json({ error: convError.message }, { status: 500 });
    }

    // Count unread
    const unreadCount = (conversations || []).filter((c: any) => {
      const isBuyer = c.buyer_user_id === user.id;
      const lastRead = isBuyer ? c.buyer_last_read_at : c.seller_last_read_at;
      
      if (!lastRead) return true; // Never read
      if (!c.last_message_at) return false; // No messages
      
      return new Date(c.last_message_at) > new Date(lastRead);
    }).length;

    return NextResponse.json({ count: unreadCount }, { status: 200 });
  } catch (error: any) {
    console.error("[unread] GET error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
