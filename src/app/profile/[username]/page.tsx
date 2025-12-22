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

  return (
    <div className="bg-[#0f1115] text-white">
      <section className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#1a1d24] to-[#0f1115] shadow-2xl overflow-hidden">
          <div className="relative">
            <div className="h-36 sm:h-48 bg-gradient-to-r from-gray-900 via-slate-900 to-black">
              <EditableBackground
                displayName={displayName}
                backgroundUrl={sellerMetrics.background_image}
                className="h-full w-full object-cover"
                heightClass="h-full"
              />
            </div>
            <div className="px-4 sm:px-8 pb-8 -mt-16">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-end gap-6">
                  <div className="flex items-end gap-4">
                    <div className="inline-flex rounded-[32px] border-4 border-[#0f1115] bg-black shadow-2xl p-2">
                      <EditableAvatar displayName={displayName} avatarUrl={sellerMetrics.avatar} className="h-28 w-28" />
                    </div>
                    <div className="space-y-3">
                      <span className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-white/60">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        Seller profile
                      </span>
                      <div className="flex flex-col gap-2">
                        <h1 className="text-3xl sm:text-4xl font-semibold text-white leading-tight">{displayName}</h1>
                        <div className="flex flex-wrap gap-2 text-sm text-white/70">
                          {infoTags.map((tag, index) => (
                            <span key={`${tag.label}-${index}`} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1">
                              {tag.icon}
                              {tag.label}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3 justify-end">
                    <FollowButton profileId={sellerMetrics.id} profileName={displayName} />
                    <EditProfileTopButton displayName={displayName} baseHref={baseHref} />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-[2fr,1fr]">
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 backdrop-blur">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <ProfileActions
                        shareText={`Check out ${displayName} on Motorsauce`}
                        shareUrl={baseHref}
                        toUsername={displayName}
                        toUserId={sellerMetrics.id}
                      />
                      {sellerMetrics.id && <ReportUserButton sellerName={displayName} sellerId={sellerMetrics.id} />}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 shadow-lg">
                    <div className="text-xs uppercase tracking-wide text-white/60">Listings live</div>
                    <SellerListingCount sellerName={displayName} className="mt-1 text-3xl font-bold text-white" />
                    <p className="text-xs text-white/50 mt-0.5">Active listings</p>
                  </div>
                  {stats.map((stat) => (
                    <div key={stat.label} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-white/60 text-xs uppercase tracking-wide">
                        {stat.icon}
                        {stat.label}
                      </div>
                      <div className="text-2xl font-semibold text-white">{stat.value}</div>
                      <p className="text-xs text-white/50">{stat.helper}</p>
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-white/10 to-white/5 p-5 text-sm leading-relaxed text-white/80 flex flex-col gap-3">
                  <p>{aboutPreview}</p>
                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-white/60">
                    <span>Tap the About tab to read the full story.</span>
                    <Link
                      href={`${baseHref}?tab=about`}
                      className="inline-flex items-center gap-1 rounded-full border border-white/30 px-3 py-1.5 text-sm font-semibold text-white hover:bg-white hover:text-black transition"
                    >
                      Open About →
                    </Link>
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

      <div className="mt-4 space-y-4">
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

      <div className="mt-10 text-sm text-gray-600">
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
