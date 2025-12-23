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
import ToastContainer from "@/components/Toast";

export default function Home() {
  return (
    <main className="mx-auto max-w-6xl px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6 md:space-y-8">
      <SEOJsonLd />
      <div className="space-y-3 sm:space-y-4">
        <HomeHero />
      </div>

      <TrustSignals />

      <JustSoldTicker />

      <section>
        <div className="flex items-center justify-between mb-2 sm:mb-3">
          <h2 className="text-lg sm:text-xl font-bold text-black">Suggested for you</h2>
          <Link href="/search" className="text-xs sm:text-sm text-gray-600 hover:underline">View all</Link>
        </div>
        <SuggestedParts limit={8} />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-[3fr_1.2fr] gap-4 lg:h-[var(--home-tiles-block-height)]">
        <div className="lg:h-full">
          <CategoryTiles />
        </div>
        <div className="self-stretch lg:h-full">
          <LiveActivityFeed />
        </div>
      </div>

      <FeaturedRow title="New this week" variant="new" />
      <FeaturedRow title="Under £250" variant="under250" />
      <FeaturedRow title="Under £20" variant="under20" />

      <SellCta />

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-black">Popular sellers</h2>
          <span className="text-sm text-gray-500">Based on recent clicks</span>
        </div>
        <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
          <PopularSellers />
        </div>
      </section>

      <RecentlyViewedRow />

      <WrenchingWall />

      <TrustBand />
      
      <ToastContainer />
    </main>
  );
}
