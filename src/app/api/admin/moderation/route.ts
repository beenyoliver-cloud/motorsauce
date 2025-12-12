import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing Supabase configuration");
  }
  return createClient(url, key);
}

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const { data: adminRecord } = await supabaseAdmin.from("admins").select("id").eq("id", user.id).single();
    if (!adminRecord) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const { action, userId, reason, duration, suspendDays } = body;
    const durationDays = duration || suspendDays; // Support both parameter names

    if (!action || !userId) {
      return NextResponse.json({ error: "Missing action or userId" }, { status: 400 });
    }

    if (userId === user.id) {
      return NextResponse.json({ error: "Cannot moderate yourself" }, { status: 400 });
    }

    const { data: targetUser } = await supabaseAdmin.from("profiles").select("id, name, email").eq("id", userId).single();
    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { data: targetAdmin } = await supabaseAdmin.from("admins").select("id").eq("id", userId).single();
    if (targetAdmin) {
      return NextResponse.json({ error: "Cannot moderate another admin" }, { status: 403 });
    }

    let updateData: Record<string, unknown> = {};
    let logDetails: Record<string, unknown> = {};

    switch (action) {
      case "ban":
        updateData = { is_banned: true, ban_reason: reason || "Violation of terms of service", banned_at: new Date().toISOString(), banned_by: user.id };
        logDetails = { reason };
        break;
      case "unban":
        updateData = { is_banned: false, ban_reason: null, banned_at: null, banned_by: null };
        break;
      case "suspend":
        const suspendedUntil = durationDays ? new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString() : null;
        updateData = { is_suspended: true, suspended_until: suspendedUntil };
        logDetails = { reason, duration_days: durationDays };
        break;
      case "unsuspend":
        updateData = { is_suspended: false, suspended_until: null };
        break;
      case "warn":
        const { data: currentUser } = await supabaseAdmin.from("profiles").select("warning_count").eq("id", userId).single();
        updateData = { warning_count: (currentUser?.warning_count || 0) + 1, last_warning_at: new Date().toISOString() };
        logDetails = { reason, new_warning_count: updateData.warning_count };
        break;
      case "clear_warnings":
        updateData = { warning_count: 0, last_warning_at: null };
        break;
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const { error: updateError } = await supabaseAdmin.from("profiles").update(updateData).eq("id", userId);
    if (updateError) {
      console.error("Error updating user:", updateError);
      return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
    }

    await supabaseAdmin.from("moderation_logs").insert({
      user_id: userId,
      admin_id: user.id,
      action,
      reason: reason || null,
      details: Object.keys(logDetails).length > 0 ? logDetails : null,
    });

    if (action === "ban" || action === "suspend") {
      await supabaseAdmin.from("listings").update({ status: "draft" }).eq("seller_id", userId).eq("status", "active");
    }

    return NextResponse.json({ success: true, message: `User ${action}ed successfully`, userId, action });
  } catch (error) {
    console.error("Moderation API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const { data: adminRecord } = await supabaseAdmin.from("admins").select("id").eq("id", user.id).single();
    if (!adminRecord) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    const { data: logs, error } = await supabaseAdmin.from("moderation_logs").select("id, action, reason, details, created_at, admin_id").eq("user_id", userId).order("created_at", { ascending: false }).limit(50);
    if (error) {
      console.error("Error fetching moderation logs:", error);
      return NextResponse.json({ error: "Failed to fetch logs" }, { status: 500 });
    }

    const adminIds = [...new Set(logs?.map(l => l.admin_id) || [])];
    const { data: admins } = await supabaseAdmin.from("profiles").select("id, name").in("id", adminIds);
    const adminMap = new Map(admins?.map(a => [a.id, a.name]) || []);

    const logsWithAdminNames = logs?.map(log => ({ ...log, admin_name: adminMap.get(log.admin_id) || "Unknown Admin" }));

    return NextResponse.json({ logs: logsWithAdminNames });
  } catch (error) {
    console.error("Moderation GET API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
