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
    <main className="mx-auto max-w-6xl px-3 sm:px-4 py-5 sm:py-8 space-y-8 sm:space-y-10 md:space-y-12 bg-white">
      <SEOJsonLd />
      <div className="space-y-3 sm:space-y-4">
        <Suspense fallback={null}>
          <HomeHero />
        </Suspense>
      </div>

      <JustSoldTicker />

      <section className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm">
        <div className="mb-2 sm:mb-3">
          <h2 className="text-lg sm:text-xl font-bold text-black">Shop by intent</h2>
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

      <div className="space-y-5 sm:space-y-6">
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

      <SellCta />

      <section className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm">
        <h2 className="text-2xl font-bold text-black mb-5">Popular sellers</h2>
        <PopularSellers />
      </section>

      <Suspense fallback={null}>
        <RecentlyViewedRow />
      </Suspense>

      <TrustBand />
      
      <ToastContainer />
    </main>
  );
}
