import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

// GET - Fetch all listings (for admin)
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAdmin(request);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { supabaseAdmin } = auth;
    const { data, error } = await supabaseAdmin
      .from("listings")
      .select("*, profiles:seller_id(id, name, username, avatar_url)")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error("Admin listings GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH - Update listing status
export async function PATCH(request: NextRequest) {
  try {
    const auth = await verifyAdmin(request);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { supabaseAdmin } = auth;
    const { listingId, status } = await request.json();

    if (!listingId || !status) {
      return NextResponse.json({ error: "Missing listingId or status" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("listings")
      .update({ status })
      .eq("id", listingId);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin listings PATCH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE - Delete listing and notify seller
export async function DELETE(request: NextRequest) {
  try {
    const auth = await verifyAdmin(request);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { user, supabaseAdmin } = auth;
    const { listingId, reason } = await request.json();

    if (!listingId) {
      return NextResponse.json({ error: "Missing listingId" }, { status: 400 });
    }

    // Get listing details before deletion
    const { data: listing, error: fetchError } = await supabaseAdmin
      .from("listings")
      .select("id, title, seller_id")
      .eq("id", listingId)
      .single();

    if (fetchError || !listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    // Delete the listing
    const { error: deleteError } = await supabaseAdmin
      .from("listings")
      .delete()
      .eq("id", listingId);

    if (deleteError) throw deleteError;

    // Create notification for the seller
    await supabaseAdmin.from("notifications").insert({
      user_id: listing.seller_id,
      type: "listing_deleted",
      title: "Listing Removed",
      message: `Your listing "${listing.title}" has been removed by an administrator. Reason: ${reason || "Policy violation"}`,
      data: { listing_id: listingId, listing_title: listing.title, reason, admin_id: user.id },
      read: false,
    });

    // Log the admin action
    await supabaseAdmin.from("moderation_logs").insert({
      user_id: listing.seller_id,
      admin_id: user.id,
      action: "delete_listing",
      reason: reason || "Policy violation",
      details: { listing_id: listingId, listing_title: listing.title },
    });

    return NextResponse.json({ success: true, message: "Listing deleted and seller notified" });
  } catch (error) {
    console.error("Admin listings DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
