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
import { MapPin, Store, Clock3, MessageCircle, Star } from "lucide-react";

/** Route types */
type PageProps = {
  params: Promise<{ username: string }>;
  searchParams?: Promise<{ tab?: string; edit?: string }>;
};

function formatResponseTime(minutes?: number | null) {
  if (!minutes || minutes <= 0) return "New seller";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.round(minutes / 60);
  return `${hours}h avg`;
}

function formatJoined(created?: string | null) {
  if (!created) return "Joined recently";
  const date = new Date(created);
  if (Number.isNaN(date.getTime())) return "Joined recently";
  return `Joined ${date.toLocaleDateString("en-GB", { month: "short", year: "numeric" })}`;
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
    <section className="max-w-6xl mx-auto px-2 sm:px-4 py-4 md:py-6 space-y-6">
      <div className="rounded-3xl border border-gray-200 bg-white shadow-lg overflow-hidden relative">
        <div className="relative h-36 sm:h-48 bg-gray-900">
          <EditableBackground
            displayName={displayName}
            backgroundUrl={sellerMetrics.background_image}
            className="absolute inset-0 object-cover"
            heightClass="h-full"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/50 via-black/20 to-white/10" />
          <div className="pointer-events-none absolute -top-10 right-8 h-32 w-32 rounded-full bg-yellow-400/30 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-12 left-6 h-28 w-28 rounded-full bg-gray-900/30 blur-3xl" />
        </div>
        <div className="px-4 sm:px-8 pb-8 relative">
          <div className="-mt-14 sm:-mt-16 flex flex-col gap-5">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end">
              <div className="flex flex-1 flex-col gap-4 sm:flex-row sm:items-end">
                <div className="relative shrink-0">
                  <div className="rounded-full bg-white/95 shadow-2xl ring-1 ring-black/5 p-1">
                    <EditableAvatar
                      displayName={displayName}
                      avatarUrl={sellerMetrics.avatar}
                      className="h-28 w-28"
                    />
                  </div>
                  <div className="pointer-events-none absolute -top-1 -right-1 h-4 w-4 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 blur-[1px]" />
                </div>
                <div className="flex-1 min-w-0 space-y-3">
                  <p className="text-[11px] uppercase tracking-[0.3em] text-gray-500">Seller profile</p>
                  <div className="space-y-2">
                    <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 leading-tight truncate">{displayName}</h1>
                    <div className="flex flex-wrap gap-2 text-sm text-gray-600">
                      {infoTags.map((tag, index) => (
                        <span
                          key={`${tag.label}-${index}`}
                          className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white/80 px-3 py-1 text-gray-700 shadow-sm"
                        >
                          {tag.icon}
                          {tag.label}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 justify-end">
                <EditProfileTopButton displayName={displayName} baseHref={baseHref} />
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <div className="flex-1 min-w-[240px]">
                <ProfileActions
                  shareText={`Check out ${displayName} on Motorsource`}
                  shareUrl={baseHref}
                  toUsername={displayName}
                  toUserId={sellerMetrics.id}
                />
              </div>
              {sellerMetrics.id && (
                <div className="flex-1 min-w-[200px] sm:flex-none">
                  <ReportUserButton sellerName={displayName} sellerId={sellerMetrics.id} />
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-gray-200 bg-white/70 px-4 py-3 shadow-inner">
              <div className="text-xs uppercase tracking-wide text-gray-500">Listings live</div>
              <SellerListingCount sellerName={displayName} className="mt-1 text-2xl font-bold text-gray-900" />
              <p className="text-xs text-gray-500 mt-0.5">Active listings</p>
            </div>
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-gray-200 bg-white/70 px-4 py-3 flex flex-col gap-1 shadow-inner">
                <div className="flex items-center gap-2 text-gray-500 text-xs uppercase tracking-wide">
                  {stat.icon}
                  {stat.label}
                </div>
                <div className="text-xl font-semibold text-gray-900">{stat.value}</div>
                <p className="text-xs text-gray-500">{stat.helper}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-2xl border border-gray-200 bg-gradient-to-r from-yellow-50 via-white to-white p-4 sm:p-5 text-sm leading-relaxed text-gray-700 flex flex-col gap-3">
            <p>{aboutPreview}</p>
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500">
              <span>Tap the About tab to read the full story.</span>
              <Link
                href={`${baseHref}?tab=about`}
                className="inline-flex items-center gap-1 rounded-full border border-gray-900 px-3 py-1.5 text-sm font-semibold text-gray-900 hover:bg-gray-900 hover:text-white transition"
              >
                Open About →
              </Link>
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
  );
}
