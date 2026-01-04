import Link from "next/link";
import type { Metadata } from "next";
import ProfileActions from "@/components/ProfileActions";
import MyListingsTab from "@/components/MyListingsTab";
import MySoldTab from "@/components/MySoldTab";
import SellerListingCount from "@/components/SellerListingCount";
import EditableAvatar from "@/components/EditableAvatar";
import MyGarageCard from "@/components/MyGarageCard";
import BusinessStorefrontWrapper from "@/components/business/BusinessStorefrontWrapper";
import FollowButton from "@/components/profile/FollowButton";
import FollowStats from "@/components/profile/FollowStats";
import SellerRating from "@/components/profile/SellerRating";
import SellerReviewsTab from "@/components/profile/SellerReviewsTab";
import { MapPin, Clock3 } from "lucide-react";
import { formatJoined } from "@/lib/profileFormatting";

// Force dynamic rendering to prevent stale profile data
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/** Route types */
type PageProps = {
  params: Promise<{ username: string }>;
  searchParams?: Promise<{ tab?: string; edit?: string }>;
};

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
  const activeTab = (sp?.tab ?? "my") as "my" | "garage" | "sold" | "reviews";
  const autoEdit = sp?.edit === "1";
  const baseHref = `/profile/${encodeURIComponent(displayName)}`;

  let sellerMetrics: {
    id?: string;
    avatar?: string | null;
    about?: string | null;
    county?: string | null;
    country?: string | null;
    total_responses?: number | null;
    created_at?: string | null;
    account_type?: string;
  } = {};
  try {
    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
    const fullUrl = `${baseUrl}/api/seller-profile?name=${encodeURIComponent(displayName)}&t=${Date.now()}`;
    const res = await fetch(fullUrl, { cache: "no-store" });
    if (res.ok) {
      sellerMetrics = await res.json();
    } else {
      const errorText = await res.text();
      console.error("[Profile SSR] Failed to fetch seller metrics", {
        status: res.status,
        statusText: res.statusText,
        body: errorText,
      });
    }
  } catch (error) {
    console.error("[Profile SSR] Error fetching seller metrics:", error);
  }

  const isBusinessAccount = sellerMetrics.account_type === "business";

  if (isBusinessAccount && sellerMetrics.id) {
    return <BusinessStorefrontWrapper profileId={sellerMetrics.id} displayName={displayName} />;
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <section className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        {/* Compact profile card - Instagram style */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-start gap-6">
            {/* Avatar */}
            <div className="shrink-0">
              <EditableAvatar displayName={displayName} avatarUrl={sellerMetrics.avatar} className="h-20 w-20 sm:h-24 sm:w-24" />
            </div>
            
            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-4 mb-3">
                <h1 className="text-xl font-semibold text-gray-900">{displayName}</h1>
                <div className="flex gap-2">
                  <FollowButton profileId={sellerMetrics.id} profileName={displayName} />
                </div>
              </div>
              
              {/* Stats row - inline with listings in yellow */}
              <div className="flex items-center gap-6 mb-3 text-sm">
                <div className="flex items-center">
                  <span className="font-semibold text-yellow-600">
                    <SellerListingCount sellerName={displayName} />
                  </span>
                  <span className="text-gray-600 ml-1">listings</span>
                </div>
                <FollowStats profileId={sellerMetrics.id} />
              </div>
              
              {/* Seller Rating */}
              <div className="mb-3">
                <SellerRating profileId={sellerMetrics.id} displayName={displayName} />
              </div>
              
              {/* Location & joined */}
              <div className="flex flex-wrap gap-3 text-xs text-gray-500 mb-2">
                {(sellerMetrics.county || sellerMetrics.country) && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {sellerMetrics.county && sellerMetrics.country
                      ? `${sellerMetrics.county}, ${sellerMetrics.country}`
                      : sellerMetrics.county || sellerMetrics.country}
                  </span>
                )}
                <span className="inline-flex items-center gap-1">
                  <Clock3 className="h-3.5 w-3.5" />
                  {formatJoined(sellerMetrics.created_at)}
                </span>
              </div>              
              {/* Bio - only show if exists */}
              {sellerMetrics.about && sellerMetrics.about.trim().length > 0 && (
                <p className="text-sm text-gray-700 mb-2">{sellerMetrics.about.trim()}</p>
              )}            </div>
          </div>
          
          {/* Actions row */}
          <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
            <ProfileActions
              shareText={`Check out ${displayName} on Motorsauce`}
              shareUrl={baseHref}
              toUsername={displayName}
              toUserId={sellerMetrics.id}
            />
          </div>
        </div>

        {/* Tabs - Instagram style */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <Link
                href={`${baseHref}?tab=my`}
                className={`flex-1 py-4 text-center text-sm font-semibold border-b-2 transition-colors ${
                  activeTab === "my"
                    ? "border-gray-900 text-gray-900"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                My Listings
              </Link>
              {!isBusinessAccount && (
                <Link
                  href={`${baseHref}?tab=garage`}
                  className={`flex-1 py-4 text-center text-sm font-semibold border-b-2 transition-colors ${
                    activeTab === "garage"
                      ? "border-gray-900 text-gray-900"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  Garage
                </Link>
              )}
              <Link
                href={`${baseHref}?tab=sold`}
                className={`flex-1 py-4 text-center text-sm font-semibold border-b-2 transition-colors ${
                  activeTab === "sold"
                    ? "border-gray-900 text-gray-900"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Sold
              </Link>
              <Link
                href={`${baseHref}?tab=reviews`}
                className={`flex-1 py-4 text-center text-sm font-semibold border-b-2 transition-colors ${
                  activeTab === "reviews"
                    ? "border-gray-900 text-gray-900"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Reviews
              </Link>
            </nav>
          </div>
          
          {/* Tab content */}
          <div className="p-4">
            {activeTab === "my" && <MyListingsTab sellerName={displayName} />}
            {activeTab === "garage" && !isBusinessAccount && <MyGarageCard displayName={displayName} />}
            {activeTab === "sold" && <MySoldTab sellerName={displayName} />}
            {activeTab === "reviews" && <SellerReviewsTab sellerId={sellerMetrics.id} sellerName={displayName} />}
          </div>
        </div>
      </section>
    </div>
  );
}
