import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;

// Helper to get authenticated user from request
async function getAuthUser(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.substring(7);
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    return null;
  }

  return user;
}

// GET /api/saved-searches - Fetch user's saved searches
export async function GET(req: NextRequest) {
  try {
    if (!supabaseServiceKey) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: searches, error } = await supabase
      .from("saved_searches")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[saved-searches] Fetch error:", error);
      return NextResponse.json(
        { error: "Failed to fetch saved searches" },
        { status: 500 }
      );
    }

    return NextResponse.json({ searches: searches || [] });
  } catch (error) {
    console.error("[saved-searches] GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/saved-searches - Create new saved search
export async function POST(req: NextRequest) {
  try {
    if (!supabaseServiceKey) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, filters, notify_new_matches = true } = body;

    // Validation
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Search name is required" },
        { status: 400 }
      );
    }

    if (!filters || typeof filters !== "object") {
      return NextResponse.json(
        { error: "Search filters are required" },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user already has a saved search with this name
    const { data: existing } = await supabase
      .from("saved_searches")
      .select("id")
      .eq("user_id", user.id)
      .eq("name", name.trim())
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "You already have a saved search with this name" },
        { status: 400 }
      );
    }

    // Create saved search
    const { data: savedSearch, error } = await supabase
      .from("saved_searches")
      .insert({
        user_id: user.id,
        name: name.trim(),
        filters,
        notify_new_matches,
      })
      .select()
      .single();

    if (error) {
      console.error("[saved-searches] Create error:", error);
      return NextResponse.json(
        { error: "Failed to create saved search" },
        { status: 500 }
      );
    }

    return NextResponse.json({ search: savedSearch }, { status: 201 });
  } catch (error) {
    console.error("[saved-searches] POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/saved-searches - Update saved search
export async function PATCH(req: NextRequest) {
  try {
    if (!supabaseServiceKey) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { search_id, name, filters, notify_new_matches } = body;

    if (!search_id) {
      return NextResponse.json(
        { error: "search_id is required" },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify ownership
    const { data: search, error: fetchError } = await supabase
      .from("saved_searches")
      .select("user_id")
      .eq("id", search_id)
      .single();

    if (fetchError || !search) {
      return NextResponse.json(
        { error: "Saved search not found" },
        { status: 404 }
      );
    }

    if (search.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Build update object
    const updates: any = {};
    if (name !== undefined) updates.name = name.trim();
    if (filters !== undefined) updates.filters = filters;
    if (notify_new_matches !== undefined)
      updates.notify_new_matches = notify_new_matches;

    // Update
    const { data: updated, error } = await supabase
      .from("saved_searches")
      .update(updates)
      .eq("id", search_id)
      .select()
      .single();

    if (error) {
      console.error("[saved-searches] Update error:", error);
      return NextResponse.json(
        { error: "Failed to update saved search" },
        { status: 500 }
      );
    }

    return NextResponse.json({ search: updated });
  } catch (error) {
    console.error("[saved-searches] PATCH error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/saved-searches - Delete saved search
export async function DELETE(req: NextRequest) {
  try {
    if (!supabaseServiceKey) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search_id = searchParams.get("search_id");

    if (!search_id) {
      return NextResponse.json(
        { error: "search_id is required" },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify ownership
    const { data: search, error: fetchError } = await supabase
      .from("saved_searches")
      .select("user_id")
      .eq("id", search_id)
      .single();

    if (fetchError || !search) {
      return NextResponse.json(
        { error: "Saved search not found" },
        { status: 404 }
      );
    }

    if (search.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete
    const { error } = await supabase
      .from("saved_searches")
      .delete()
      .eq("id", search_id);

    if (error) {
      console.error("[saved-searches] Delete error:", error);
      return NextResponse.json(
        { error: "Failed to delete saved search" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[saved-searches] DELETE error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
