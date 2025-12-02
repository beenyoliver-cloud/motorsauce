// src/app/api/notifications/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * GET /api/notifications
 * Fetch notifications for the authenticated user
 * Query params:
 *  - limit: number of notifications to fetch (default 20)
 *  - unreadOnly: boolean to fetch only unread notifications
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify the user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // Get query params
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const unreadOnly = searchParams.get("unreadOnly") === "true";

    // Build query
    let query = supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (unreadOnly) {
      query = query.eq("read", false);
    }

    const { data: notifications, error } = await query;

    if (error) {
      console.error("[notifications] Error fetching notifications:", error);
      return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
    }

    return NextResponse.json({ notifications });
  } catch (error) {
    console.error("[notifications] Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PATCH /api/notifications
 * Mark notification(s) as read
 * Body:
 *  - notificationId: string (optional, marks single notification)
 *  - markAllRead: boolean (optional, marks all as read)
 */
export async function PATCH(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify the user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const body = await request.json();
    const { notificationId, markAllRead } = body;

    if (markAllRead) {
      // Mark all notifications as read
      const { error } = await supabase
        .from("notifications")
        .update({ read: true, updated_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .eq("read", false);

      if (error) {
        console.error("[notifications] Error marking all as read:", error);
        return NextResponse.json({ error: "Failed to mark notifications as read" }, { status: 500 });
      }

      return NextResponse.json({ success: true, marked: "all" });
    } else if (notificationId) {
      // Mark single notification as read
      const { error } = await supabase
        .from("notifications")
        .update({ read: true, updated_at: new Date().toISOString() })
        .eq("id", notificationId)
        .eq("user_id", user.id);

      if (error) {
        console.error("[notifications] Error marking notification as read:", error);
        return NextResponse.json({ error: "Failed to mark notification as read" }, { status: 500 });
      }

      return NextResponse.json({ success: true, notificationId });
    } else {
      return NextResponse.json({ error: "Must provide notificationId or markAllRead" }, { status: 400 });
    }
  } catch (error) {
    console.error("[notifications] Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * GET /api/notifications/count
 * Get unread notification count
 */
export async function HEAD(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new NextResponse(null, { status: 401 });
    }

    const token = authHeader.substring(7);
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify the user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new NextResponse(null, { status: 401 });
    }

    const { count, error } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("read", false);

    if (error) {
      console.error("[notifications] Error fetching count:", error);
      return new NextResponse(null, { status: 500 });
    }

    return new NextResponse(null, {
      status: 200,
      headers: { "X-Unread-Count": String(count || 0) },
    });
  } catch (error) {
    console.error("[notifications] Unexpected error:", error);
    return new NextResponse(null, { status: 500 });
  }
}
