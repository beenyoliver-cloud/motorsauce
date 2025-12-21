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
    if (profileIds.length) {
      const profilePromise = supabaseAdmin
        .from("profiles")
        .select("id, name, email, account_type, business_verified, verification_status, verification_notes")
        .in("id", profileIds);

      const businessPromise = supabaseAdmin
        .from("business_info")
        .select("profile_id, business_name, business_type, phone_number, website_url")
        .in("profile_id", profileIds);

      const [{ data: profileRows }, { data: businessRows }] = await Promise.all([profilePromise, businessPromise]);
      profiles = profileRows || [];
      businesses = businessRows || [];
    }

    const enriched = await Promise.all(
      (verifications || []).map(async (v) => {
        let documentSignedUrl: string | null = null;
        if (v.document_url) {
          if (/^https?:\/\//.test(v.document_url)) {
            documentSignedUrl = v.document_url;
          } else {
            const { data: signed } = await supabaseAdmin.storage
              .from(COMPLIANCE_BUCKET)
              .createSignedUrl(v.document_url, 60 * 10);
            documentSignedUrl = signed?.signedUrl || null;
          }
        }
        return {
          ...v,
          profile: profiles.find((p) => p.id === v.profile_id) || null,
          business: businesses.find((b) => b.profile_id === v.profile_id) || null,
          document_signed_url: documentSignedUrl,
        };
      })
    );

    return NextResponse.json(enriched);
  } catch (err) {
    console.error("Admin verification GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAdmin(request);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { supabaseAdmin, user } = auth;
    const { verificationId, action, notes } = await request.json();

    if (!verificationId || !["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "Missing verificationId or invalid action" }, { status: 400 });
    }

    const { data: verification, error: fetchError } = await supabaseAdmin
      .from("seller_verifications")
      .select("*")
      .eq("id", verificationId)
      .single();

    if (fetchError || !verification) {
      return NextResponse.json({ error: "Verification request not found" }, { status: 404 });
    }

    const profileId = verification.profile_id;
    const reviewNote = typeof notes === "string" && notes.trim() ? notes.trim() : null;

    if (action === "approve") {
      await supabaseAdmin
        .from("seller_verifications")
        .update({ status: "approved", review_notes: reviewNote })
        .eq("id", verificationId);

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
        .eq("id", verificationId);

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

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Admin verification POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
