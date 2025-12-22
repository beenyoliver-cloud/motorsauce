import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, anon, { auth: { persistSession: false } });
}

export async function POST(req: Request) {
  try {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const targetId = body?.profileId as string | undefined;
    const action = body?.action as "follow" | "unfollow" | undefined;

    if (!targetId || !action) {
      return NextResponse.json({ error: "profileId and action are required" }, { status: 400 });
    }
    if (targetId === user.id) {
      return NextResponse.json({ error: "Cannot follow yourself" }, { status: 400 });
    }

    if (action === "follow") {
      const { error } = await supabase.from("profile_followers").upsert({
        follower_id: user.id,
        following_id: targetId,
      });
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("profile_followers")
        .delete()
        .eq("follower_id", user.id)
        .eq("following_id", targetId);
      if (error) throw error;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("/api/profile/follow error", error);
    return NextResponse.json({ error: "Failed to update follow state" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(req.url);
    const profileId = searchParams.get("profileId");
    if (!profileId) {
      return NextResponse.json({ error: "profileId is required" }, { status: 400 });
    }
    const { data: { user } } = await supabase.auth.getUser();

    const [{ data: followers }, { data: following }] = await Promise.all([
      supabase
        .from("profile_followers")
        .select("follower_id")
        .eq("following_id", profileId),
      supabase
        .from("profile_followers")
        .select("following_id")
        .eq("follower_id", profileId),
    ]);

    const isFollowing = user
      ? (await supabase
          .from("profile_followers")
          .select("follower_id")
          .eq("following_id", profileId)
          .eq("follower_id", user.id)
          .maybeSingle()).data != null
      : false;

    return NextResponse.json({
      followers: followers?.length || 0,
      following: following?.length || 0,
      isFollowing,
    });
  } catch (error) {
    console.error("/api/profile/follow GET error", error);
    return NextResponse.json({ error: "Failed to load follow stats" }, { status: 500 });
  }
}
