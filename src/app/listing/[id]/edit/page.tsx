// src/app/listing/[id]/edit/page.tsx
import { notFound, redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase";
import EditListingForm from "@/components/EditListingForm";

export const dynamic = "force-dynamic";

async function fetchListing(id: string) {
  const supa = supabaseServer();
  const { data, error } = await supa
    .from("listings")
    .select("*, seller:profiles!seller_id ( id, name )")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return data;
}

async function getUser() {
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  return user;
}

export default async function EditListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const listing = await fetchListing(id);
  if (!listing) notFound();
  const user = await getUser();

  if (!user || listing.seller_id !== user.id) {
    // Not the owner; redirect to listing view
    redirect(`/listing/${id}`);
  }

  return (
    <section className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-black">Edit Listing</h1>
      <EditListingForm listing={listing} />
    </section>
  );
}
