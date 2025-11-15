// src/app/profile/id/[id]/page.tsx
import { redirect } from "next/navigation";
import { supabase as supabaseServerAnon } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

export default async function ProfileByIdPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supa = supabaseServerAnon;

  // Fetch profile by id
  const { data, error } = await supa
    .from("profiles")
    .select("id, name, avatar")
    .eq("id", id)
    .maybeSingle();

  // If not found, redirect home
  if (error || !data) {
    redirect("/");
  }

  // Prefer username route for canonical path
  const displayName = data.name || "User";
  redirect(`/profile/${encodeURIComponent(displayName)}`);
}
