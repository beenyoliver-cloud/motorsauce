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
    title: `${displayName} • Seller • Motorsauce`,
    description: `View ${displayName}'s listings on Motorsauce.`,
  };
}

export default async function ProfilePage({ params, searchParams }: PageProps) {
  const { username } = await params;
  const sp = await searchParams;
  const displayName = decodeURIComponent(username);
  const activeTab = (sp?.tab ?? "my") as "saved" | "my" | "about" | "reviews";
  const autoEdit = sp?.edit === "1";
  const baseHref = `/profile/${encodeURIComponent(displayName)}`;

  return (
    <section className="max-w-7xl mx-auto px-4 py-8">
      {/* ---------- Header ---------- */}
      <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-br from-yellow-50 via-white to-white">
        <div className="p-6 md:p-8">
          <div className="flex items-start gap-4 md:gap-6">
            {/* Avatar */}
            <EditableAvatar displayName={displayName} />

            {/* Main info */}
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <h1 className="text-2xl md:text-3xl font-bold text-black">{displayName}</h1>
                {/* Only for the signed-in user on their own profile */}
                <EditProfileTopButton displayName={displayName} baseHref={baseHref} />
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-gray-700">
                <div className="flex items-center gap-2">
                  <StarRow value={5} />
                  <span className="font-medium text-black">5.0</span>
                  <span className="text-gray-500">(0)</span>
                </div>
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <span>United Kingdom</span>
                </div>
                <div className="flex items-center gap-1">
                  <Store className="h-4 w-4 text-gray-400" />
                  <span>Member since 2025</span>
                </div>
              </div>

              {/* Stats */}
              <div className="mt-4 grid grid-cols-3 gap-3 max-w-md">
                <div className="rounded-lg border border-gray-200 bg-white p-3 text-center">
                  <div className="text-xs text-gray-500">Listings</div>
                  <SellerListingCount sellerName={displayName} />
                </div>
                <div className="rounded-lg border border-gray-200 bg-white p-3 text-center">
                  <div className="text-xs text-gray-500">Rating</div>
                  <div className="text-lg font-semibold text-yellow-600">5.0</div>
                </div>
                <div className="rounded-lg border border-gray-200 bg-white p-3 text-center">
                  <div className="text-xs text-gray-500">Reviews</div>
                  <div className="text-lg font-semibold text-yellow-600">0</div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 min-w-[140px]">
              <ProfileActions
                shareText={`Check out ${displayName} on Motorsauce`}
                shareUrl={baseHref}
                toUsername={displayName}
              />
              <ReportUserButton sellerName={displayName} />
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
          <ProfileAboutCard displayName={displayName} autoEdit={autoEdit} />
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
