// src/app/profile/[username]/page.tsx
import Link from "next/link";
import type { Metadata } from "next";
import ProfileActions from "@/components/ProfileActions";
import ReportUserButton from "@/components/ReportUserButton";
import MyListingsTab from "@/components/MyListingsTab";
import SavedTabGate from "@/components/SavedTabGate";
import SellerListingCount from "@/components/SellerListingCount";
import EditableAvatar from "@/components/EditableAvatar";
import EditableBackground from "@/components/EditableBackground";
import ProfileAboutCard from "@/components/ProfileAboutCard";
import EditProfileTopButton from "@/components/EditProfileTopButton";
import MyGarageCard from "@/components/MyGarageCard";
import BusinessStorefrontWrapper from "@/components/business/BusinessStorefrontWrapper";
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
  const activeTab = (sp?.tab ?? "my") as "saved" | "my" | "about" | "reviews" | "garage";
  const autoEdit = sp?.edit === "1";
  const baseHref = `/profile/${encodeURIComponent(displayName)}`;

  // Fetch seller metrics and user ID for response time and messaging
  let sellerMetrics: { 
    id?: string;
    avg_response_time_minutes?: number | null; 
    response_rate?: number | null;
    account_type?: string;
    avatar?: string | null;
    background_image?: string | null;
    about?: string | null;
  } = {};
  try {
    // Use absolute URL for server-side fetch
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3001';
    
    const fullUrl = `${baseUrl}/api/seller-profile?name=${encodeURIComponent(displayName)}`;
    console.log("[Profile SSR] Fetching seller metrics from:", fullUrl);
    console.log("[Profile SSR] Environment:", { 
      VERCEL_URL: process.env.VERCEL_URL,
      NODE_ENV: process.env.NODE_ENV 
    });
    
    const res = await fetch(fullUrl, { cache: "no-store" });
    console.log("[Profile SSR] Fetch response status:", res.status);
    
    if (res.ok) {
      sellerMetrics = await res.json();
      console.log("[Profile SSR] Successfully fetched seller metrics:", sellerMetrics);
    } else {
      const errorText = await res.text();
      console.error("[Profile SSR] Failed to fetch seller metrics:", {
        status: res.status,
        statusText: res.statusText,
        body: errorText
      });
    }
  } catch (error) {
    console.error("[Profile SSR] Error fetching seller metrics:", error);
  }

  // If business account, show different profile layout
  const isBusinessAccount = sellerMetrics.account_type === 'business';
  console.log("[Profile SSR] Is business account:", isBusinessAccount, "account_type:", sellerMetrics.account_type);

  // If business account, render business storefront
  if (isBusinessAccount && sellerMetrics.id) {
    return <BusinessStorefrontWrapper profileId={sellerMetrics.id} displayName={displayName} />;
  }

  return (
    <section className="max-w-6xl mx-auto px-2 sm:px-4 py-4 md:py-6">
      {/* ---------- Header ---------- */}
      <div className="rounded-lg md:rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {/* Background Banner - Editable */}
        <EditableBackground 
          displayName={displayName} 
          backgroundUrl={sellerMetrics.background_image}
        />
        <div className="p-3 sm:p-4 md:p-6">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-3 md:gap-4">
            {/* Avatar */}
            <div className="shrink-0">
              <EditableAvatar displayName={displayName} avatarUrl={sellerMetrics.avatar} />
            </div>

            {/* Main info */}
            <div className="flex-1 text-center md:text-left w-full md:w-auto">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-black truncate px-2 md:px-0">{displayName}</h1>
                <div className="hidden md:block">
                  <EditProfileTopButton displayName={displayName} baseHref={baseHref} />
                </div>
              </div>

              <div className="mt-2 flex flex-wrap items-center justify-center md:justify-start gap-2 sm:gap-3 text-xs sm:text-sm text-gray-600 px-2 md:px-0">
                <div className="flex items-center gap-1.5">
                  <StarRow value={5} />
                  <span className="font-medium text-black">5.0</span>
                  <span className="text-gray-500">(0)</span>
                </div>
                <span className="text-gray-300 hidden sm:inline">•</span>
                <div className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-gray-400" />
                  <span>UK</span>
                </div>
                <span className="text-gray-300 hidden sm:inline">•</span>
                <div className="flex items-center gap-1">
                  <Store className="h-3.5 w-3.5 text-gray-400" />
                  <span>Joined 2025</span>
                </div>
              </div>

              {/* Stats */}
              <div className="mt-3 md:mt-4 inline-flex gap-4 sm:gap-6 text-center">
                <div>
                  <SellerListingCount sellerName={displayName} className="block text-lg sm:text-xl font-bold text-black" />
                  <div className="text-[10px] sm:text-xs text-gray-500 mt-0.5">Listings</div>
                </div>
                <div>
                  <div className="text-lg sm:text-xl font-bold text-black">5.0</div>
                  <div className="text-[10px] sm:text-xs text-gray-500 mt-0.5">Rating</div>
                </div>
                <div>
                  <div className="text-lg sm:text-xl font-bold text-black">0</div>
                  <div className="text-[10px] sm:text-xs text-gray-500 mt-0.5">Reviews</div>
                </div>
              </div>
            </div>

            {/* Actions - Desktop: Side column */}
            <div className="hidden md:flex md:flex-col gap-2 md:w-auto">
              <ProfileActions
                shareText={`Check out ${displayName} on Motorsource`}
                shareUrl={baseHref}
                toUsername={displayName}
                toUserId={sellerMetrics.id}
              />
              <ReportUserButton sellerName={displayName} />
            </div>
          </div>

          {/* Actions - Mobile: Full width below profile info */}
          <div className="mt-3 flex flex-col gap-2 md:hidden">
            <div className="flex gap-2">
              <ProfileActions
                shareText={`Check out ${displayName} on Motorsource`}
                shareUrl={baseHref}
                toUsername={displayName}
                toUserId={sellerMetrics.id}
              />
            </div>
            <div className="flex gap-2">
              <ReportUserButton sellerName={displayName} />
              <div className="flex-1">
                <EditProfileTopButton displayName={displayName} baseHref={baseHref} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ---------- Tabs (Saved is private; label adapts to owner/other) ---------- */}
      <SavedTabGate 
        sellerName={displayName} 
        baseHref={baseHref} 
        activeTab={activeTab}
        isBusinessAccount={isBusinessAccount}
      />

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

        {/* Garage tab - personal users only */}
        {activeTab === "garage" && !isBusinessAccount && (
          <MyGarageCard displayName={displayName} />
        )}
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
