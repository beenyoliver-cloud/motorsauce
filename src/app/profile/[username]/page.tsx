// src/app/profile/[username]/page.tsx
import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import ProfileActions from "@/components/ProfileActions";
import ReportUserButton from "@/components/ReportUserButton";
import MyListingsTab from "@/components/MyListingsTab";
import MyDraftsTab from "@/components/MyDraftsTab";
import MySoldTab from "@/components/MySoldTab";
import SavedTabGate from "@/components/SavedTabGate";
import SellerListingCount from "@/components/SellerListingCount";
import EditableAvatar from "@/components/EditableAvatar";
import EditableBackground from "@/components/EditableBackground";
import ProfileAboutCard from "@/components/ProfileAboutCard";
import EditProfileTopButton from "@/components/EditProfileTopButton";
import MyGarageCard from "@/components/MyGarageCard";
import BusinessStorefrontWrapper from "@/components/business/BusinessStorefrontWrapper";
import FollowButton from "@/components/profile/FollowButton";
import FollowStats from "@/components/profile/FollowStats";
import { MapPin, Store, Clock3, MessageCircle, Star } from "lucide-react";
import { formatJoined, formatResponseTime } from "@/lib/profileFormatting";

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
  const activeTab = (sp?.tab ?? "my") as "saved" | "my" | "drafts" | "sold" | "about" | "reviews" | "garage";
  const autoEdit = sp?.edit === "1";
  const baseHref = `/profile/${encodeURIComponent(displayName)}`;

  let sellerMetrics: {
    id?: string;
    avg_response_time_minutes?: number | null;
    response_rate?: number | null;
    account_type?: string;
    business_verified?: boolean | null;
    verification_status?: string | null;
    avatar?: string | null;
    background_image?: string | null;
    about?: string | null;
    county?: string | null;
    country?: string | null;
    total_responses?: number | null;
    created_at?: string | null;
  } = {};
  try {
    const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3001";
    const fullUrl = `${baseUrl}/api/seller-profile?name=${encodeURIComponent(displayName)}`;
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

  const infoTags: Array<{ icon: ReactNode; label: string }> = [];
  if (sellerMetrics.county || sellerMetrics.country) {
    infoTags.push({
      icon: <MapPin className="h-4 w-4 text-gray-500" />,
      label:
        sellerMetrics.county && sellerMetrics.country
          ? `${sellerMetrics.county}, ${sellerMetrics.country}`
          : sellerMetrics.county || sellerMetrics.country || "",
    });
  }
  infoTags.push({
    icon: <Store className="h-4 w-4 text-gray-500" />,
    label: formatJoined(sellerMetrics.created_at),
  });

  const stats = [
    {
      label: "Response time",
      value: formatResponseTime(sellerMetrics.avg_response_time_minutes),
      helper: sellerMetrics.avg_response_time_minutes ? "avg reply" : "new to messaging",
      icon: <Clock3 className="h-4 w-4 text-gray-500" />,
    },
    {
      label: "Response rate",
      value: sellerMetrics.response_rate ? `${sellerMetrics.response_rate}%` : "Building trust",
      helper: "last 30 days",
      icon: <MessageCircle className="h-4 w-4 text-gray-500" />,
    },
    {
      label: "Enquiries answered",
      value: sellerMetrics.total_responses ?? 0,
      helper: "lifetime",
      icon: <Star className="h-4 w-4 text-gray-500" />,
    },
  ];

  const aboutPreview =
    sellerMetrics.about && sellerMetrics.about.trim().length > 0
      ? sellerMetrics.about.trim().slice(0, 180) + (sellerMetrics.about.length > 180 ? "…" : "")
      : `${displayName} hasn’t shared an about section yet. Check their listings or drop them a message to learn more.`;

  const trustSignals = [
    sellerMetrics.business_verified
      ? { label: "Verified seller", detail: "ID confirmed", icon: <Star className="h-4 w-4 text-amber-500" /> }
      : sellerMetrics.verification_status === "pending"
      ? { label: "Verification pending", detail: "Documents submitted", icon: <Clock3 className="h-4 w-4 text-amber-500" /> }
      : { label: "Community seller", detail: "Trusted by buyers", icon: <Star className="h-4 w-4 text-gray-500" /> },
    { label: "Fast replies", detail: formatResponseTime(sellerMetrics.avg_response_time_minutes), icon: <Clock3 className="h-4 w-4 text-sky-500" /> },
    { label: "Local hero", detail: sellerMetrics.county || "Across the UK", icon: <MapPin className="h-4 w-4 text-rose-500" /> },
  ];

  return (
    <div className="bg-gray-50 min-h-screen">
      <section className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div className="rounded-3xl bg-white shadow-2xl border border-gray-100 overflow-hidden">
          <div className="relative">
            <div className="h-40 sm:h-48 bg-gradient-to-r from-gray-900 via-gray-800 to-black">
              <EditableBackground
                displayName={displayName}
                backgroundUrl={sellerMetrics.background_image}
                className="h-full w-full object-cover"
                heightClass="h-full"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/60" />
            </div>

            <div className="px-4 sm:px-8 pb-8 -mt-20 relative z-10">
              <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
                <div className="bg-white rounded-2xl shadow-lg p-6 space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="inline-flex rounded-[28px] border-4 border-white shadow-xl">
                      <EditableAvatar displayName={displayName} avatarUrl={sellerMetrics.avatar} className="h-28 w-28" />
                    </div>
                    <div className="flex-1 space-y-3">
                      <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.3em] text-gray-500">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" /> Seller profile
                      </div>
                      <h1 className="text-3xl font-semibold text-gray-900 leading-tight">{displayName}</h1>
                      <div className="flex flex-wrap gap-2 text-sm text-gray-600">
                        {infoTags.map((tag, index) => (
                          <span key={`${tag.label}-${index}`} className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3 py-1">
                            {tag.icon}
                            {tag.label}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 sm:flex-col">
                      <FollowButton profileId={sellerMetrics.id} profileName={displayName} />
                      <EditProfileTopButton displayName={displayName} baseHref={baseHref} />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                      <div className="text-xs uppercase text-gray-500">Live listings</div>
                      <SellerListingCount sellerName={displayName} className="text-3xl font-semibold text-gray-900" />
                      <p className="text-xs text-gray-500 mt-0.5">Updated hourly</p>
                    </div>
                    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                      <div className="text-xs uppercase text-gray-500">Followers</div>
                      <div className="mt-2">
                        <FollowStats profileId={sellerMetrics.id} />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    {stats.map((stat) => (
                      <div key={stat.label} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                        <div className="flex items-center gap-2 text-gray-500 text-xs uppercase tracking-wide">
                          {stat.icon}
                          {stat.label}
                        </div>
                        <div className="text-2xl font-semibold text-gray-900 mt-1">{stat.value}</div>
                        <p className="text-xs text-gray-500">{stat.helper}</p>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-2xl border border-gray-100 bg-gradient-to-r from-white via-amber-50/60 to-white p-5 flex flex-col gap-3">
                    <div className="flex items-center gap-2 text-xs uppercase text-gray-500">
                      <Star className="h-4 w-4 text-amber-500" /> Story snapshot
                    </div>
                    <p className="text-gray-700 leading-relaxed">{aboutPreview}</p>
                    <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-gray-600">
                      <span>Tap the About tab to read the full story.</span>
                      <Link
                        href={`${baseHref}?tab=about`}
                        className="inline-flex items-center gap-1 rounded-full border border-gray-900 px-3 py-1.5 text-gray-900 font-semibold hover:bg-gray-900 hover:text-white transition"
                      >
                        Open About →
                      </Link>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-100 bg-white shadow-lg p-6 space-y-5">
                  <ProfileActions
                    shareText={`Check out ${displayName} on Motorsauce`}
                    shareUrl={baseHref}
                    toUsername={displayName}
                    toUserId={sellerMetrics.id}
                  />
                  {sellerMetrics.id && <ReportUserButton sellerName={displayName} sellerId={sellerMetrics.id} />}
                  <div className="grid gap-3 text-sm text-gray-700">
                    {trustSignals.map((signal) => (
                      <div key={signal.label} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
                        {signal.icon}
                        <div>
                          <p className="font-semibold text-gray-900">{signal.label}</p>
                          <p className="text-xs text-gray-500">{signal.detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <SavedTabGate
          sellerName={displayName}
          baseHref={baseHref}
          activeTab={activeTab}
          isBusinessAccount={isBusinessAccount}
        />

        <div className="space-y-4">
          {activeTab === "my" && <MyListingsTab sellerName={displayName} />}
          {activeTab === "drafts" && <MyDraftsTab sellerName={displayName} />}
          {activeTab === "sold" && <MySoldTab sellerName={displayName} />}
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
          {activeTab === "garage" && !isBusinessAccount && <MyGarageCard displayName={displayName} />}
        </div>

        <div className="pt-6 text-sm text-gray-600">
          <Link href="/" className="hover:text-yellow-600">
            Home
          </Link>
          <span className="mx-2">/</span>
          <span className="text-gray-800">{displayName}</span>
        </div>
      </section>
    </div>
  );
}
