// src/app/profile/[username]/page.tsx
import Link from "next/link";
import type { Metadata } from "next";
import ProfileActions from "@/components/ProfileActions";
import ReportUserButton from "@/components/ReportUserButton";
import MyListingsTab from "@/components/MyListingsTab";
import SavedTabGate from "@/components/SavedTabGate";
import SellerListingCount from "@/components/SellerListingCount";
import EditableAvatar from "@/components/EditableAvatar";
import ProfileAboutCard from "@/components/ProfileAboutCard";
import EditProfileTopButton from "@/components/EditProfileTopButton";
import MyGarageCard from "@/components/MyGarageCard";
import { Star, MapPin, Store } from "lucide-react";

/** Route types */
type PageProps = {
  params: Promise<{ username: string }>;
  searchParams?: Promise<{ tab?: string; edit?: string }>;
};

function StarRow({ value }: { value: number }) {
  const full = Math.max(0, Math.min(5, Math.floor(value)));
  return (
    <div className="flex items-center">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${
            i < full ? "fill-yellow-500 text-yellow-500" : "text-gray-300"
          }`}
        />
      ))}
    </div>
  );
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params;
  const displayName = decodeURIComponent(username);
  return {
    title: `${displayName} • Seller • Motorsource`,
    description: `View ${displayName}'s listings on Motorsource.`,
  };
}

export default async function ProfilePage({ params, searchParams }: PageProps) {
  const { username } = await params;
  const sp = await searchParams;
  const displayName = decodeURIComponent(username);
  const activeTab = (sp?.tab ?? "my") as "saved" | "my" | "about" | "reviews";
  const autoEdit = sp?.edit === "1";
  const baseHref = `/profile/${encodeURIComponent(displayName)}`;

  // Fetch seller metrics for response time
  let sellerMetrics: { avg_response_time_minutes?: number | null; response_rate?: number | null } = {};
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL ? 'https://' + new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).host : 'http://localhost:3001'}/api/seller-profile?name=${encodeURIComponent(displayName)}`,
      { cache: "no-store" }
    );
    if (res.ok) {
      sellerMetrics = await res.json();
    }
  } catch (error) {
    console.error("Failed to fetch seller metrics:", error);
  }

  return (
    <section className="max-w-6xl mx-auto px-4 py-6">
      {/* ---------- Header ---------- */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="p-4 md:p-6">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-4">
            {/* Avatar */}
            <div className="shrink-0">
              <EditableAvatar displayName={displayName} />
            </div>

            {/* Main info */}
            <div className="flex-1 text-center md:text-left">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <h1 className="text-2xl font-bold text-black">{displayName}</h1>
                <div className="hidden md:block">
                  <EditProfileTopButton displayName={displayName} baseHref={baseHref} />
                </div>
              </div>

              <div className="mt-2 flex flex-wrap items-center justify-center md:justify-start gap-3 text-sm text-gray-600">
                <div className="flex items-center gap-1.5">
                  <StarRow value={5} />
                  <span className="font-medium text-black">5.0</span>
                  <span className="text-gray-500">(0)</span>
                </div>
                <span className="text-gray-300">•</span>
                <div className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-gray-400" />
                  <span>UK</span>
                </div>
                <span className="text-gray-300">•</span>
                <div className="flex items-center gap-1">
                  <Store className="h-3.5 w-3.5 text-gray-400" />
                  <span>Joined 2025</span>
                </div>
              </div>

              {/* Stats */}
              <div className="mt-4 inline-flex gap-6 text-center">
                <div>
                  <SellerListingCount sellerName={displayName} className="block text-xl font-bold text-black" />
                  <div className="text-xs text-gray-500 mt-0.5">Listings</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-black">5.0</div>
                  <div className="text-xs text-gray-500 mt-0.5">Rating</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-black">0</div>
                  <div className="text-xs text-gray-500 mt-0.5">Reviews</div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="w-full md:w-auto flex md:flex-col gap-2">
              <ProfileActions
                shareText={`Check out ${displayName} on Motorsource`}
                shareUrl={baseHref}
                toUsername={displayName}
              />
              <ReportUserButton sellerName={displayName} />
              <div className="md:hidden flex-1">
                <EditProfileTopButton displayName={displayName} baseHref={baseHref} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ---------- Tabs (Saved is private; label adapts to owner/other) ---------- */}
      <SavedTabGate sellerName={displayName} baseHref={baseHref} activeTab={activeTab} />

      {/* ---------- Content ---------- */}
      <div className="mt-4 space-y-4">
        {activeTab === "my" && <MyListingsTab sellerName={displayName} />}

        {activeTab === "about" && (
          <ProfileAboutCard 
            displayName={displayName} 
            autoEdit={autoEdit}
            avgResponseTimeMinutes={sellerMetrics.avg_response_time_minutes}
            responseRate={sellerMetrics.response_rate}
          />
        )}

        {activeTab === "reviews" && (
          <div className="rounded-xl border border-dashed border-gray-300 p-10 text-center text-gray-600">
            No reviews yet.
          </div>
        )}

        {/* NEW: My Garage (owner can toggle Public/Private, others see only if Public) */}
        <MyGarageCard displayName={displayName} />
      </div>

      {/* Breadcrumbs */}
      <div className="mt-10 text-sm text-gray-600">
        <Link href="/" className="hover:text-yellow-600">Home</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-800">{displayName}</span>
      </div>
    </section>
  );
}
