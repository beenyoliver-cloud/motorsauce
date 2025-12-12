// src/app/listing/[id]/edit/page.tsx
import EditListingPageClient from "@/components/EditListingPageClient";

export const dynamic = "force-dynamic";

export default async function EditListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  return <EditListingPageClient listingId={id} />;
}
