import HeroCarousel from "@/components/HeroCarousel";
import Link from "next/link";
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
import TrustSignals from "@/components/home/TrustSignals";
import WrenchingWall from "@/components/home/WrenchingWall";

import SEOJsonLd from "@/components/SEOJsonLd";

export default function Home() {
  return (
    <main className="mx-auto max-w-6xl px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6 md:space-y-8">
      {/* SEO structured data */}
      {/* @ts-ignore */}
      <SEOJsonLd />
      {/* Hero + inline search */}
      <div className="space-y-3 sm:space-y-4">
        <HeroCarousel />
        {/* @ts-ignore Server -> Client import allowed */}
        <HomeHero />
      </div>

      {/* Trust signals strip */}
      <TrustSignals />

      {/* Just Sold ticker - social proof banner */}
      {/* @ts-ignore Server -> Client import allowed */}
      <JustSoldTicker />

      {/* Live activity feed + Category tiles side by side on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3">
          {/* @ts-ignore Server -> Client import allowed */}
          <CategoryTiles />
        </div>
        <div className="lg:col-span-1">
          {/* @ts-ignore Server -> Client import allowed */}
          <LiveActivityFeed />
        </div>
      </div>

      {/* Featured rows */}
      <FeaturedRow title="New this week" variant="new" />
      <FeaturedRow title="Under £250" variant="under250" />
      <FeaturedRow title="Under £20" variant="under20" />

      {/* Suggested parts (personalized via API) */}
      <section>
        <div className="flex items-center justify-between mb-2 sm:mb-3">
          <h2 className="text-lg sm:text-xl font-bold text-black">Suggested for you</h2>
          <Link href="/search" className="text-xs sm:text-sm text-gray-600 hover:underline">View all</Link>
        </div>
        <SuggestedParts limit={8} />
      </section>

      {/* Sell CTA */}
      <SellCta />

      {/* Popular sellers */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-black">Popular sellers</h2>
          <span className="text-sm text-gray-500">Based on recent clicks</span>
        </div>
        <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
          {/* @ts-ignore Server -> Client import allowed */}
          <PopularSellers />
        </div>
      </section>

      {/* Recently viewed */}
      {/* @ts-ignore Server -> Client import allowed */}
      <RecentlyViewedRow />

      <WrenchingWall />

      {/* Trust band */}
      <TrustBand />
    </main>
  );
}
