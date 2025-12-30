import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;
  if (!url || !key) throw new Error("Missing Supabase configuration");
  return createClient(url, key, { auth: { persistSession: false } });
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
    console.log("[Admin Listings] Starting fetch...");
    const { searchParams } = new URL(request.url);

    const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1);
    const pageSize = Math.min(Math.max(parseInt(searchParams.get("pageSize") || "20", 10), 1), 100);
    const status = searchParams.get("status") || "all";
    const search = (searchParams.get("search") || "").trim();

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const baseColumns =
      "id, title, price, status, created_at, images, seller_id, category, profiles:seller_id(id, name, username, avatar_url)";
    const columnsWithViews = `${baseColumns}, view_count`;

    let query = supabaseAdmin.from("listings").select(columnsWithViews, { count: "exact" });
    let hasViewCount = true;
    let reportedIds: string[] = [];

    if (status === "reported") {
      let reportedRows: { listing_id: string }[] | null = null;
      const { data: reportedData, error: reportFilterError } = await supabaseAdmin
        .from("listing_reports")
        .select("listing_id")
        .eq("status", "pending");

      if (reportFilterError) {
        if (reportFilterError.code === "42P01") {
          console.warn("[Admin Listings] listing_reports table missing; skipping reported filter.");
        } else {
          throw reportFilterError;
        }
      } else {
        reportedRows = reportedData;
      }

      reportedIds = Array.from(new Set((reportedRows || []).map((row) => row.listing_id).filter(Boolean)));
      if (!reportedIds.length) {
        return NextResponse.json({ listings: [], total: 0, page, pageSize });
      }

      query = query.in("id", reportedIds);
    } else if (status && status !== "all") {
      query = query.eq("status", status);
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,category.ilike.%${search}%`);
    }

    let { data, count, error } = await query.order("created_at", { ascending: false }).range(from, to);
    if (error && hasViewCount && error.code === "42703") {
      console.warn("[Admin Listings] view_count column missing; retrying without it.");
      hasViewCount = false;
      let fallbackQuery = supabaseAdmin
        .from("listings")
        .select(baseColumns, { count: "exact" });
      
      if (status === "reported" && reportedIds.length) {
        fallbackQuery = fallbackQuery.in("id", reportedIds);
      } else if (status && status !== "all") {
        fallbackQuery = fallbackQuery.eq("status", status);
      }
      
      if (search) {
        fallbackQuery = fallbackQuery.or(`title.ilike.%${search}%,category.ilike.%${search}%`);
      }
      
      fallbackQuery = fallbackQuery.order("created_at", { ascending: false }).range(from, to);
      const result = await fallbackQuery;
      data = result.data as typeof data;
      count = result.count;
      error = result.error;
    }
    if (error) throw error;

    const listingIds = (data || []).map((listing) => listing.id).filter(Boolean);
    const idFilter = listingIds.length ? listingIds : ["__none__"];

    const safeQuery = async <T>(
      query: any,
      label: string
    ): Promise<T[]> => {
      const { data, error } = await query;
      if (error) {
        if (error.code === "42P01") {
          console.warn(`[Admin Listings] ${label} table missing; returning empty set.`);
          return [];
        }
        console.error(`[Admin Listings] ${label} query error:`, error);
        throw error;
      }
      return data || [];
    };

    const [saves, offers, reports] = await Promise.all([
      safeQuery<{ listing_id: string }>(supabaseAdmin.from("saved_listings").select("listing_id").in("listing_id", idFilter), "saved_listings"),
      safeQuery<{ listing_id: string }>(supabaseAdmin.from("offers").select("listing_id").in("listing_id", idFilter), "offers"),
      safeQuery<{ listing_id: string; status?: string }>(supabaseAdmin.from("listing_reports").select("listing_id, status").in("listing_id", idFilter), "listing_reports"),
    ]);

    const countByListing = (rows: { listing_id: string; status?: string }[] | null | undefined, statusFilter?: string) => {
      const map = new Map<string, number>();
      (rows || []).forEach((row) => {
        if (!row?.listing_id) return;
        if (statusFilter && row.status !== statusFilter) return;
        map.set(row.listing_id, (map.get(row.listing_id) || 0) + 1);
      });
      return map;
    };

    const saveCounts = countByListing(saves);
    const offerCounts = countByListing(offers);
    const reportCounts = countByListing(reports, "pending");

    const listings = (data || []).map((listing) => {
      const profile = Array.isArray(listing.profiles) ? listing.profiles[0] : listing.profiles;
      return {
        id: listing.id,
        title: listing.title,
        price: listing.price || 0,
        status: listing.status,
        created_at: listing.created_at,
        images: listing.images || [],
        seller_id: listing.seller_id,
        seller_name: profile?.name || "Unknown",
        seller_username: profile?.username || "",
        seller_avatar: profile?.avatar_url || null,
        view_count: hasViewCount ? listing.view_count || 0 : 0,
        save_count: saveCounts.get(listing.id) || 0,
        offer_count: offerCounts.get(listing.id) || 0,
        report_count: reportCounts.get(listing.id) || 0,
        category: listing.category || "",
      };
    });

    return NextResponse.json({ listings, total: count || 0, page, pageSize });
  } catch (error) {
    console.error("Admin listings GET error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
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
