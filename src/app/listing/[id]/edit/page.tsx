// src/app/listing/[id]/edit/page.tsx
import { notFound, redirect } from "next/navigation";
import { supabase as supabaseServerAnon } from "@/lib/supabaseServer";
import EditListingForm from "@/components/EditListingForm";

export const dynamic = "force-dynamic";

async function fetchListing(id: string) {
  const supa = supabaseServerAnon;
  const { data, error } = await supa
    .from("listings")
    .select("*, seller:profiles!seller_id ( id, name )")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return data;
}

async function getUser() {
  const supa = supabaseServerAnon;
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
    <section className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Edit Your Listing</h1>
          <p className="text-lg text-gray-600">Update your listing details</p>
          <p className="text-sm text-gray-500 mt-2">Fields marked with <span className="text-red-500">*</span> are required</p>
        </div>
        <EditListingForm listing={listing} />
      </div>
    </section>
  );
}
