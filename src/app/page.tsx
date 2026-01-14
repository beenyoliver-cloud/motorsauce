import Link from "next/link";
import { Suspense } from "react";
import PopularSellers from "@/components/PopularSellers";
import SuggestedParts from "@/components/SuggestedParts";
import HomeHero from "@/components/home/HomeHero";
import CategoryTiles from "@/components/home/CategoryTiles";
import FeaturedRow from "@/components/home/FeaturedRow";
import RecentlyViewedRow from "@/components/home/RecentlyViewedRow";
import PopularListingsRow from "@/components/home/PopularListingsRow";
import TrendingActivitySection from "@/components/home/TrendingActivitySection";
import TrustBand from "@/components/home/TrustBand";
import SellCta from "@/components/home/SellCta";
import SEOJsonLd from "@/components/SEOJsonLd";
import ToastContainer from "@/components/Toast";

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <SEOJsonLd />
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-3 sm:py-8 space-y-3 sm:space-y-8">
        {/* Vehicle compatibility front and center */}
        <div>
          <Suspense fallback={null}>
            <HomeHero />
          </Suspense>
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
          <Link
            href="/search"
            className="rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition shadow-sm px-2 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm font-semibold text-gray-800 text-center"
          >
            Browse all parts →
          </Link>
          <Link
            href="/categories"
            className="rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition shadow-sm px-2 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm font-semibold text-gray-800 text-center"
          >
            Shop by category →
          </Link>
          <Link
            href="/saved-searches"
            className="rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition shadow-sm px-2 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm font-semibold text-gray-800 text-center col-span-2 sm:col-span-1"
          >
            Notify me when a part is available →
          </Link>
        </div>

        {/* Seller CTA */}
        <SellCta />

        <PopularListingsRow />

        {/* Categories */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-3 sm:p-5">
          <div className="flex items-center justify-between mb-2 sm:mb-4">
            <h2 className="text-base sm:text-xl font-bold text-slate-900">Browse by category</h2>
            <Link href="/categories" className="text-xs sm:text-sm font-semibold text-slate-700 hover:text-slate-900">
              View all →
            </Link>
          </div>
          <CategoryTiles />
        </div>

        <SuggestedParts limit={8} />

        {/* Featured rows, marketplace spacing */}
        <div className="space-y-3 sm:space-y-4">
          <FeaturedRow title="Fresh this week" variant="new" />
          <FeaturedRow title="Deals under £250" variant="under250" />
        </div>

        <TrendingActivitySection />

        {/* Popular sellers */}
        <section className="rounded-xl border border-gray-200 bg-white shadow-sm p-3 sm:p-6">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 className="text-base sm:text-2xl font-bold text-slate-900">Popular sellers</h2>
            <Link href="/profile" className="text-xs sm:text-sm font-semibold text-slate-700 hover:text-slate-900">
              See all →
            </Link>
          </div>
          <PopularSellers />
        </section>

        <TrustBand />

        <Suspense fallback={null}>
          <RecentlyViewedRow />
        </Suspense>
      </div>

      <ToastContainer />
    </main>
  );
}
