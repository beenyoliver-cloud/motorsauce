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
    <main className="mx-auto max-w-6xl px-3 sm:px-4 py-5 sm:py-8 space-y-6 sm:space-y-8 md:space-y-10 bg-[#f5f5f5]">
      <SEOJsonLd />
      <div className="space-y-3 sm:space-y-4">
        <Suspense fallback={null}>
          <HomeHero />
        </Suspense>
      </div>

      <TrustBand />

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <JustSoldTicker />
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm">
        <div className="flex items-center justify-between mb-2 sm:mb-3">
          <h2 className="text-lg sm:text-xl font-bold text-black">Shop by intent</h2>
          <Link href="/search" className="text-xs sm:text-sm text-gray-600 hover:underline">View all</Link>
        </div>
        <SuggestedParts limit={8} />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-[3fr_1.2fr] gap-4 sm:gap-6 lg:h-[var(--home-tiles-block-height)]">
        <div className="lg:h-full rounded-xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm">
          <CategoryTiles />
        </div>
        <div className="self-stretch lg:h-full rounded-xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm">
          <LiveActivityFeed />
        </div>
      </div>

      <div className="space-y-4 sm:space-y-5">
        <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm">
          <FeaturedRow title="New this week" variant="new" />
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm">
          <FeaturedRow title="Under £250" variant="under250" />
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm">
          <FeaturedRow title="Under £20" variant="under20" />
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm">
        <SellCta />
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-black">Popular sellers</h2>
          <span className="text-sm text-gray-500">Based on recent clicks</span>
        </div>
        <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
          <PopularSellers />
        </div>
      </section>

      <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm">
        <RecentlyViewedRow />
      </div>
      
      <ToastContainer />
    </main>
  );
}
