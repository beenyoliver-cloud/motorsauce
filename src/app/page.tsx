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

export default function Home() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-6 space-y-8">
      {/* Hero + inline search */}
      <div className="space-y-4">
        <HeroCarousel />
        {/* @ts-ignore Server -> Client import allowed */}
        <HomeHero />
      </div>

      {/* Category tiles */}
      {/* @ts-ignore Server -> Client import allowed */}
      <CategoryTiles />

      {/* Featured rows */}
      {/* @ts-ignore Server -> Client import allowed */}
      <FeaturedRow title="New this week" variant="new" />
      {/* @ts-ignore Server -> Client import allowed */}
      <FeaturedRow title="Under £250" variant="under250" />

      {/* Suggested parts (personalized via API) */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold text-black">Suggested for you</h2>
          <Link href="/search" className="text-sm text-gray-600 hover:underline">View all</Link>
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

      {/* Trust band */}
      <TrustBand />
    </main>
  );
}