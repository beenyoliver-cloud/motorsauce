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
      <div className="mx-auto max-w-6xl px-2 sm:px-4 lg:px-6 py-3 sm:py-8 space-y-3 sm:space-y-8">
        {/* Vehicle compatibility front and center */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <Suspense fallback={null}>
            <HomeHero />
          </Suspense>
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
          <Link
            href="/search"
            className="rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition shadow-sm px-2 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm font-semibold text-slate-800 text-center"
          >
            Browse all parts →
          </Link>
          <Link
            href="/categories"
            className="rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition shadow-sm px-2 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm font-semibold text-slate-800 text-center"
          >
            Shop by category →
          </Link>
          <Link
            href="/sell"
            className="rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 transition shadow-sm px-2 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm font-semibold text-amber-900 text-center col-span-2 sm:col-span-1"
          >
            List an item →
          </Link>
        </div>

        {/* Activity + ticker in a single card */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-3 sm:p-5 space-y-2 sm:space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-xl font-semibold">Trending right now</h2>
            <Link href="/search" className="text-xs sm:text-sm font-semibold text-slate-700 hover:text-slate-900">
              View all →
            </Link>
          </div>
          <JustSoldTicker />
          <LiveActivityFeed />
        </div>

        {/* Shop by need */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm p-3 sm:p-5">
          <div className="flex items-center justify-between mb-2 sm:mb-4">
            <div>
              <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.18em] text-slate-500 font-semibold">Shop by need</p>
              <h2 className="text-base sm:text-2xl font-bold text-slate-900 leading-tight">Choose a path and we'll surface the right parts</h2>
            </div>
            <Link href="/search" className="text-xs sm:text-sm font-semibold text-slate-700 hover:text-slate-900 flex-shrink-0">
              Browse all →
            </Link>
          </div>
          <SuggestedParts limit={8} />
        </section>

        {/* Categories */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-3 sm:p-5">
          <div className="flex items-center justify-between mb-2 sm:mb-4">
            <h2 className="text-base sm:text-xl font-bold text-slate-900">Browse by category</h2>
            <Link href="/categories" className="text-xs sm:text-sm font-semibold text-slate-700 hover:text-slate-900">
              View all →
            </Link>
          </div>
          <CategoryTiles />
        </div>

        {/* Sell CTA */}
        <div className="rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 via-white to-white shadow-sm p-3 sm:p-5">
          <SellCta />
        </div>

        {/* Featured rows, marketplace spacing */}
        <div className="space-y-3 sm:space-y-4">
          <FeaturedRow title="Fresh this week" variant="new" />
          <FeaturedRow title="Deals under £250" variant="under250" />
        </div>

        {/* Popular sellers */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm p-3 sm:p-6">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 className="text-base sm:text-2xl font-bold text-slate-900">Popular sellers</h2>
            <Link href="/profile" className="text-xs sm:text-sm font-semibold text-slate-700 hover:text-slate-900">
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
