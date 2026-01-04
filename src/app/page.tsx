import Link from "next/link";
import { Suspense } from "react";
import PopularSellers from "@/components/PopularSellers";
import SuggestedParts from "@/components/SuggestedParts";
import HomeHero from "@/components/home/HomeHero";
import CategoryTiles from "@/components/home/CategoryTiles";
import FeaturedRow from "@/components/home/FeaturedRow";
import RecentlyViewedRow from "@/components/home/RecentlyViewedRow";
import TrustBand from "@/components/home/TrustBand";
import SellCta from "@/components/home/SellCta";
import LiveActivityFeed from "@/components/home/LiveActivityFeed";
import JustSoldTicker from "@/components/home/JustSoldTicker";
import SEOJsonLd from "@/components/SEOJsonLd";
import ToastContainer from "@/components/Toast";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-white text-slate-900">
      <SEOJsonLd />
      <div className="relative isolate overflow-hidden">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_20%_20%,rgba(252,211,77,0.18),transparent_32%),radial-gradient(circle_at_80%_5%,rgba(96,165,250,0.16),transparent_28%),radial-gradient(circle_at_50%_70%,rgba(45,212,191,0.14),transparent_28%)]" />
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-10 sm:space-y-12 relative">
          <div className="grid gap-4 lg:gap-6 lg:grid-cols-[2fr_1.05fr]">
            <div className="rounded-2xl bg-white shadow-xl border border-slate-100 p-4 sm:p-6 lg:p-7">
              <Suspense fallback={null}>
                <HomeHero />
              </Suspense>
            </div>
            <div className="space-y-4">
              <div className="rounded-2xl bg-white shadow-lg border border-slate-100">
                <JustSoldTicker />
              </div>
              <div className="rounded-2xl bg-white shadow-lg border border-slate-100 p-4 sm:p-5">
                <LiveActivityFeed />
              </div>
            </div>
          </div>

          <section className="rounded-2xl bg-white shadow-xl border border-slate-100 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500 font-semibold">Shop by intent</p>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Get what you actually need</h2>
              </div>
              <Link href="/search" className="text-sm font-semibold text-slate-900 hover:text-slate-600">
                Browse all →
              </Link>
            </div>
            <SuggestedParts limit={8} />
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-4 sm:gap-6">
            <div className="rounded-2xl bg-white shadow-xl border border-slate-100 p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h2 className="text-xl font-bold text-slate-900">Categories at a glance</h2>
                <Link href="/categories" className="text-sm font-semibold text-slate-900 hover:text-slate-600">
                  View all →
                </Link>
              </div>
              <CategoryTiles />
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-amber-50 via-white to-white shadow-xl border border-amber-100 p-4 sm:p-5">
              <SellCta />
            </div>
          </div>

          <div className="space-y-4 sm:space-y-5">
            <div className="rounded-2xl bg-white shadow-xl border border-slate-100 p-4 sm:p-5">
              <FeaturedRow title="New this week" variant="new" />
            </div>
            <div className="rounded-2xl bg-white shadow-xl border border-slate-100 p-4 sm:p-5">
              <FeaturedRow title="Under £250" variant="under250" />
            </div>
            <div className="rounded-2xl bg-white shadow-xl border border-slate-100 p-4 sm:p-5">
              <FeaturedRow title="Under £20" variant="under20" />
            </div>
          </div>

          <section className="rounded-2xl bg-white shadow-xl border border-slate-100 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-slate-900">Popular sellers</h2>
              <Link href="/profile" className="text-sm font-semibold text-slate-900 hover:text-slate-600">
                See all →
              </Link>
            </div>
            <PopularSellers />
          </section>

          <Suspense fallback={null}>
            <RecentlyViewedRow />
          </Suspense>

          <TrustBand />
        </div>
      </div>

      <ToastContainer />
    </main>
  );
}
