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
      icon: <MapPin className="h-4 w-4 text-white/70" />,
      label:
        sellerMetrics.county && sellerMetrics.country
          ? `${sellerMetrics.county}, ${sellerMetrics.country}`
          : sellerMetrics.county || sellerMetrics.country || "",
    });
  }
  infoTags.push({
    icon: <Store className="h-4 w-4 text-white/70" />,
    label: formatJoined(sellerMetrics.created_at),
  });

  const stats = [
    {
      label: "Response time",
      value: formatResponseTime(sellerMetrics.avg_response_time_minutes),
      helper: sellerMetrics.avg_response_time_minutes ? "avg reply" : "new to messaging",
      icon: <Clock3 className="h-4 w-4 text-white/70" />,
    },
    {
      label: "Response rate",
      value: sellerMetrics.response_rate ? `${sellerMetrics.response_rate}%` : "Building trust",
      helper: "last 30 days",
      icon: <MessageCircle className="h-4 w-4 text-white/70" />,
    },
    {
      label: "Enquiries answered",
      value: sellerMetrics.total_responses ?? 0,
      helper: "lifetime",
      icon: <Star className="h-4 w-4 text-white/70" />,
    },
  ];

  const aboutPreview =
    sellerMetrics.about && sellerMetrics.about.trim().length > 0
      ? sellerMetrics.about.trim().slice(0, 180) + (sellerMetrics.about.length > 180 ? "…" : "")
      : `${displayName} hasn’t shared an about section yet. Check their listings or drop them a message to learn more.`;

  return (
    <section className="max-w-6xl mx-auto px-2 sm:px-4 py-4 md:py-6 space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-slate-900/10 bg-slate-950 text-white shadow-2xl">
        <div className="absolute inset-0">
          <EditableBackground
            displayName={displayName}
            backgroundUrl={sellerMetrics.background_image}
            className="absolute inset-0 opacity-40"
            heightClass="h-full"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-slate-900/40" />
        </div>
        <div className="relative z-10 px-4 py-6 sm:px-6 md:px-10 md:py-10 space-y-6">
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex flex-1 items-start gap-4">
              <EditableAvatar
                displayName={displayName}
                avatarUrl={sellerMetrics.avatar}
                className="ring-offset-slate-900 drop-shadow-2xl"
              />
              <div className="space-y-2 min-w-0">
                <p className="text-[11px] uppercase tracking-[0.4em] text-white/70">Seller profile</p>
                <h1 className="text-2xl sm:text-3xl font-bold leading-tight">{displayName}</h1>
                <div className="flex flex-wrap gap-2 text-sm text-white/80">
                  {infoTags.map(({ icon, label }) => (
                    <span key={label} className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 backdrop-blur">
                      {icon}
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
              <ProfileActions
                shareText={`Check out ${displayName} on Motorsource`}
                shareUrl={baseHref}
                toUsername={displayName}
                toUserId={sellerMetrics.id}
              />
              {sellerMetrics.id && <ReportUserButton sellerName={displayName} sellerId={sellerMetrics.id} />}
              <EditProfileTopButton displayName={displayName} baseHref={baseHref} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-2xl bg-white/10 backdrop-blur px-4 py-3">
              <div className="text-xs uppercase tracking-wide text-white/70">Listings live</div>
              <SellerListingCount sellerName={displayName} className="mt-1 text-3xl font-bold text-white" />
              <p className="text-xs text-white/70 mt-0.5">Active listings across the marketplace</p>
            </div>
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-2xl bg-white/10 backdrop-blur px-4 py-3 flex flex-col gap-1">
                <div className="flex items-center gap-2 text-white/70 text-xs uppercase tracking-wide">
                  {stat.icon}
                  {stat.label}
                </div>
                <div className="text-2xl font-semibold text-white">{stat.value}</div>
                <p className="text-xs text-white/70">{stat.helper}</p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl bg-white/10 border border-white/20 p-4 text-sm leading-relaxed text-white/90 flex flex-col gap-2">
            <p>{aboutPreview}</p>
            <div className="flex items-center justify-between text-xs text-white/70">
              <span>Tap into the About tab to read the full story.</span>
              <Link href={`${baseHref}?tab=about`} className="text-white hover:text-yellow-200 underline">
                Open About
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
