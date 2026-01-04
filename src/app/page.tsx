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
    <main className="min-h-screen bg-white text-slate-900">
      <SEOJsonLd />
      <div className="mx-auto max-w-6xl px-3 sm:px-4 lg:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* Vehicle compatibility front and center */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <Suspense fallback={null}>
            <HomeHero />
          </Suspense>
        </div>

        {/* Activity + ticker, storefront-style */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg sm:text-xl font-semibold">Trending now</h2>
              <Link href="/search" className="text-sm font-semibold text-slate-700 hover:text-slate-900">
                View all →
              </Link>
            </div>
            <LiveActivityFeed />
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <JustSoldTicker />
          </div>
        </div>

        {/* Shop by intent */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 font-semibold">Shop by intent</p>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Find the right part, quickly</h2>
            </div>
            <Link href="/search" className="text-sm font-semibold text-slate-700 hover:text-slate-900">
              Browse all →
            </Link>
          </div>
          <SuggestedParts limit={8} />
        </section>

        {/* Categories + sell CTA */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.25fr_0.95fr] gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h2 className="text-xl font-bold text-slate-900">Browse by category</h2>
              <Link href="/categories" className="text-sm font-semibold text-slate-700 hover:text-slate-900">
                View all →
              </Link>
            </div>
            <CategoryTiles />
          </div>
          <div className="rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 via-white to-white shadow-sm p-4 sm:p-5">
            <SellCta />
          </div>
        </div>

        {/* Featured rows, marketplace spacing */}
        <div className="space-y-4">
          <FeaturedRow title="Fresh this week" variant="new" />
          <FeaturedRow title="Deals under £250" variant="under250" />
          <FeaturedRow title="Budget picks under £20" variant="under20" />
        </div>

        {/* Popular sellers */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-slate-900">Popular sellers</h2>
            <Link href="/profile" className="text-sm font-semibold text-slate-700 hover:text-slate-900">
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

      <ToastContainer />
    </main>
  );
}
