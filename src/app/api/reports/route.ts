// src/app/api/reports/route.ts
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

// GET /api/reports - Get reports (admin only)
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

    // Check if user is admin
    const { data: admin } = await supabase
      .from("admins")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (!admin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const userId = searchParams.get("userId");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // If filtering by user, use direct query, otherwise use RPC function
    let reports, reportsError;
    
    if (userId) {
      const query = supabase
        .from("user_reports")
        .select(`
          id,
          reporter_id,
          reported_user_id,
          reported_user_name,
          reason,
          details,
          status,
          admin_notes,
          reviewed_by,
          reviewed_at,
          created_at,
          updated_at,
          reporter:profiles!user_reports_reporter_id_fkey(name, email)
        `)
        .eq("reported_user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit);
      
      if (status) {
        query.eq("status", status);
      }
      
      const result = await query;
      reports = result.data?.map((r: any) => ({
        report_id: r.id,
        reporter_id: r.reporter_id,
        reporter_name: r.reporter?.name || "Unknown",
        reporter_email: r.reporter?.email || "Unknown",
        reported_user_id: r.reported_user_id,
        reported_user_name: r.reported_user_name,
        reported_user_email: "",
        reason: r.reason,
        details: r.details,
        status: r.status,
        admin_notes: r.admin_notes,
        reviewed_by: r.reviewed_by,
        reviewed_at: r.reviewed_at,
        created_at: r.created_at,
        updated_at: r.updated_at,
      }));
      reportsError = result.error;
    } else {
      // Use RPC function to get reports with details
      const result = await supabase
        .rpc("get_reports_with_details", {
          p_status: status,
          p_limit: limit,
          p_offset: offset,
        });
      reports = result.data;
      reportsError = result.error;
    }

    if (reportsError) {
      console.error("[reports API] Error fetching reports:", reportsError);
      return NextResponse.json({ error: reportsError.message }, { status: 500 });
    }

    return NextResponse.json({ reports: reports || [] }, { status: 200 });
  } catch (error: any) {
    console.error("[reports API] GET error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

// POST /api/reports - Submit a new report
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
    const { reported_user_id, reported_user_name, reason, details } = body;

    // Validation
    if (!reported_user_id || !reported_user_name || !reason || !details) {
      return NextResponse.json(
        { error: "reported_user_id, reported_user_name, reason, and details are required" },
        { status: 400 }
      );
    }

    if (!["fraud", "counterfeit", "abuse", "spam", "other"].includes(reason)) {
      return NextResponse.json({ error: "Invalid reason" }, { status: 400 });
    }

    if (!details.trim() || details.trim().length < 10) {
      return NextResponse.json(
        { error: "Details must be at least 10 characters" },
        { status: 400 }
      );
    }

    // Prevent self-reporting
    if (reported_user_id === user.id) {
      return NextResponse.json({ error: "You cannot report yourself" }, { status: 400 });
    }

    // Insert report
    const { data: report, error: insertError } = await supabase
      .from("user_reports")
      .insert({
        reporter_id: user.id,
        reported_user_id,
        reported_user_name: reported_user_name.trim(),
        reason,
        details: details.trim(),
        status: "pending",
      })
      .select()
      .single();

    if (insertError) {
      console.error("[reports API] Insert error:", insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // TODO: Send email notification to admins
    // You can use SendGrid, Resend, or Supabase Edge Functions for this

    console.log("[reports API] Report created:", {
      id: report.id,
      reporter: user.id,
      reported: reported_user_id,
      reason,
    });

    return NextResponse.json({ report }, { status: 201 });
  } catch (error: any) {
    console.error("[reports API] POST error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/reports?id=xxx - Update report status (admin only)
export async function PATCH(req: Request) {
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

    // Check if user is admin
    const { data: admin } = await supabase
      .from("admins")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (!admin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const reportId = searchParams.get("id");

    if (!reportId) {
      return NextResponse.json({ error: "Report ID is required" }, { status: 400 });
    }

    const body = await req.json();
    const updates: any = {};

    if (body.status !== undefined) {
      if (!["pending", "investigating", "resolved", "dismissed"].includes(body.status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      updates.status = body.status;
      updates.reviewed_by = user.id;
      updates.reviewed_at = new Date().toISOString();
    }

    if (body.admin_notes !== undefined) {
      updates.admin_notes = body.admin_notes?.trim() || null;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No updates provided" }, { status: 400 });
    }

    const { data: report, error: updateError } = await supabase
      .from("user_reports")
      .update(updates)
      .eq("id", reportId)
      .select()
      .single();

    if (updateError) {
      if (updateError.code === "PGRST116") {
        return NextResponse.json({ error: "Report not found" }, { status: 404 });
      }
      console.error("[reports API] Update error:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ report }, { status: 200 });
  } catch (error: any) {
    console.error("[reports API] PATCH error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
