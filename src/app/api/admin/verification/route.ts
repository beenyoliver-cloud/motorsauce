import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const COMPLIANCE_BUCKET = "seller-compliance";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase configuration");
  return createClient(url, key);
}

async function verifyAdmin(request: NextRequest) {
  const supabaseAdmin = getSupabaseAdmin();
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.split(" ")[1];
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return null;

  const { data: admin } = await supabaseAdmin.from("admins").select("id").eq("id", user.id).single();
  if (!admin) return null;

  return { user, supabaseAdmin };
}

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAdmin(request);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { supabaseAdmin } = auth;
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get("status") || "pending";

    let query = supabaseAdmin
      .from("seller_verifications")
      .select("*")
      .order("created_at", { ascending: false });

    if (statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    } else {
      query = query.limit(200);
    }

    const { data: verifications, error } = await query;
    if (error) throw error;

    const profileIds = Array.from(new Set((verifications || []).map((v) => v.profile_id))).filter(Boolean) as string[];

  let profiles: any[] = [];
  let businesses: any[] = [];
  const historyMap: Record<string, any[]> = {};
    if (profileIds.length) {
      const profilePromise = supabaseAdmin
        .from("profiles")
        .select("id, name, email, account_type, business_verified, verification_status, verification_notes")
        .in("id", profileIds);

      const businessPromise = supabaseAdmin
        .from("business_info")
        .select("profile_id, business_name, business_type, phone_number, website_url")
        .in("profile_id", profileIds);

      const historyPromise = supabaseAdmin
        .from("seller_verifications")
        .select("id, profile_id, status, review_notes, created_at")
        .in("profile_id", profileIds)
        .order("created_at", { ascending: false });

      const [{ data: profileRows }, { data: businessRows }, { data: historyRows }] = await Promise.all([
        profilePromise,
        businessPromise,
        historyPromise,
      ]);
      profiles = profileRows || [];
      businesses = businessRows || [];
      historyRows?.forEach((entry) => {
        if (!entry?.profile_id) return;
        if (!historyMap[entry.profile_id]) historyMap[entry.profile_id] = [];
        historyMap[entry.profile_id].push(entry);
      });
    }

    const enriched = await Promise.all(
      (verifications || []).map(async (v) => {
        try {
          let storagePath: string | null = null;
          if (typeof v.document_url === "string" && v.document_url.length > 0) {
            if (/^https?:\/\//.test(v.document_url)) {
              const match = v.document_url.match(/seller-compliance\/(.+)$/);
              if (match && match[1]) storagePath = match[1];
            } else {
              storagePath = v.document_url;
            }
          }

          let documentSignedUrl: string | null = null;
          if (storagePath) {
            const { data: signed, error: signError } = await supabaseAdmin.storage
              .from(COMPLIANCE_BUCKET)
              .createSignedUrl(storagePath, 600);
            if (!signError) documentSignedUrl = signed?.signedUrl || null;
          }

          return {
            ...v,
            document_url: null,
            profile: profiles.find((p) => p.id === v.profile_id) || null,
            business: businesses.find((b) => b.profile_id === v.profile_id) || null,
            document_signed_url: documentSignedUrl,
            history: historyMap[v.profile_id] || [],
          };
        } catch (mapErr) {
          console.error("Error enriching verification:", mapErr);
          // Return minimal version on error
          return {
            ...v,
            document_url: null,
            document_signed_url: null,
            profile: profiles.find((p) => p.id === v.profile_id) || null,
            business: businesses.find((b) => b.profile_id === v.profile_id) || null,
            history: historyMap[v.profile_id] || [],
          };
        }
      })
    );

    return NextResponse.json(enriched);
  } catch (err) {
    console.error("Admin verification GET error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAdmin(request);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { supabaseAdmin } = auth;
    const payload = await request.json();
    const action = payload?.action;
    const noteMap =
      payload?.noteMap && typeof payload.noteMap === "object"
        ? (payload.noteMap as Record<string, string>)
        : null;
    const defaultNotes = typeof payload?.notes === "string" ? payload.notes : "";

    let ids: string[] = [];
    if (Array.isArray(payload?.verificationIds)) {
      ids = payload.verificationIds.filter((id: unknown) => typeof id === "string");
    } else if (typeof payload?.verificationId === "string") {
      ids = [payload.verificationId];
    }

    if (!ids.length || !["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "Missing verificationIds or invalid action" }, { status: 400 });
    }

    const { data: verificationRows, error: fetchError } = await supabaseAdmin
      .from("seller_verifications")
      .select("*")
      .in("id", ids);

    if (fetchError || !verificationRows?.length) {
      return NextResponse.json({ error: "Verification request not found" }, { status: 404 });
    }

    for (const verification of verificationRows) {
      const profileId = verification.profile_id;
      const reviewNoteRaw =
        (noteMap && typeof noteMap[verification.id] === "string" && noteMap[verification.id]) || defaultNotes;
      const reviewNote = reviewNoteRaw && typeof reviewNoteRaw === "string" ? reviewNoteRaw.trim() : null;

      if (action === "approve") {
        await supabaseAdmin
          .from("seller_verifications")
          .update({ status: "approved", review_notes: reviewNote })
          .eq("id", verification.id);

        await supabaseAdmin
          .from("profiles")
          .update({ business_verified: true, verification_status: "approved", verification_notes: null })
          .eq("id", profileId);

        await supabaseAdmin.from("notifications").insert({
          user_id: profileId,
          type: "seller_verified",
          title: "You're verified",
          message: "Your compliance documents were approved. You can now publish listings instantly.",
          read: false,
        });
      } else {
        await supabaseAdmin
          .from("seller_verifications")
          .update({ status: "rejected", review_notes: reviewNote })
          .eq("id", verification.id);

        await supabaseAdmin
          .from("profiles")
          .update({ business_verified: false, verification_status: "rejected", verification_notes: reviewNote })
          .eq("id", profileId);

        await supabaseAdmin.from("notifications").insert({
          user_id: profileId,
          type: "seller_verification_update",
          title: "Verification update",
          message: `We couldn't approve your documents. ${reviewNote || "Please upload updated information."}`,
          read: false,
        });
      }
    }

    return NextResponse.json({ success: true, processed: ids.length });
  } catch (err) {
    console.error("Admin verification POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
