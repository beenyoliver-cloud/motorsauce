// src/app/api/todos/route.ts
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

// GET /api/todos - Get all todos for current user
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

    const { searchParams } = new URL(req.url);
    const completed = searchParams.get("completed");

    let query = supabase
      .from("user_todos")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    // Filter by completed status if specified
    if (completed !== null) {
      query = query.eq("completed", completed === "true");
    }

    const { data: todos, error: todosError } = await query;

    if (todosError) {
      console.error("[todos API] Error fetching todos:", todosError);
      return NextResponse.json({ error: todosError.message }, { status: 500 });
    }

    return NextResponse.json({ todos: todos || [] }, { status: 200 });
  } catch (error: any) {
    console.error("[todos API] GET error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

// POST /api/todos - Create a new todo
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
    const { title, description, priority, due_date } = body;

    if (!title?.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    // Validate priority
    if (priority && !["low", "medium", "high"].includes(priority)) {
      return NextResponse.json({ error: "Invalid priority" }, { status: 400 });
    }

    const { data: todo, error: insertError } = await supabase
      .from("user_todos")
      .insert({
        user_id: user.id,
        title: title.trim(),
        description: description?.trim() || null,
        priority: priority || "medium",
        due_date: due_date || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error("[todos API] Insert error:", insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ todo }, { status: 201 });
  } catch (error: any) {
    console.error("[todos API] POST error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/todos?id=xxx - Update a todo
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

    const { searchParams } = new URL(req.url);
    const todoId = searchParams.get("id");

    if (!todoId) {
      return NextResponse.json({ error: "Todo ID is required" }, { status: 400 });
    }

    const body = await req.json();
    const updates: any = {};

    if (body.title !== undefined) updates.title = body.title.trim();
    if (body.description !== undefined) updates.description = body.description?.trim() || null;
    if (body.completed !== undefined) updates.completed = body.completed;
    if (body.priority !== undefined) {
      if (!["low", "medium", "high"].includes(body.priority)) {
        return NextResponse.json({ error: "Invalid priority" }, { status: 400 });
      }
      updates.priority = body.priority;
    }
    if (body.due_date !== undefined) updates.due_date = body.due_date || null;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No updates provided" }, { status: 400 });
    }

    const { data: todo, error: updateError } = await supabase
      .from("user_todos")
      .update(updates)
      .eq("id", todoId)
      .eq("user_id", user.id) // Ensure user owns the todo
      .select()
      .single();

    if (updateError) {
      if (updateError.code === "PGRST116") {
        return NextResponse.json({ error: "Todo not found" }, { status: 404 });
      }
      console.error("[todos API] Update error:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ todo }, { status: 200 });
  } catch (error: any) {
    console.error("[todos API] PATCH error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/todos?id=xxx - Delete a todo
export async function DELETE(req: Request) {
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

    const { searchParams } = new URL(req.url);
    const todoId = searchParams.get("id");

    if (!todoId) {
      return NextResponse.json({ error: "Todo ID is required" }, { status: 400 });
    }

    const { error: deleteError } = await supabase
      .from("user_todos")
      .delete()
      .eq("id", todoId)
      .eq("user_id", user.id); // Ensure user owns the todo

    if (deleteError) {
      console.error("[todos API] Delete error:", deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error("[todos API] DELETE error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
