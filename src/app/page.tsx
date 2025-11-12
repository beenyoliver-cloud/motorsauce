import HeroCarousel from "@/components/HeroCarousel";
import SafeImage from "@/components/SafeImage";
import Link from "next/link";
import PopularSellers from "@/components/PopularSellers";
import SuggestedParts from "@/components/SuggestedParts";

export default function Home() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-6">
        <HeroCarousel />
      </div>

      {/* Suggested parts (personalized) */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-yellow-500">Suggested Parts</h2>
          <Link href="/search" className="text-sm text-gray-600 hover:underline">
            View all
          </Link>
        </div>

        <SuggestedParts />
      </section>

      {/* popular sellers (dynamic) */}
      <section className="mt-8 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-yellow-500">Popular Sellers</h2>
          <span className="text-sm text-gray-500">Based on recent clicks</span>
        </div>
        <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
          {/* Client component loads dynamic popular sellers and tracks clicks */}
          {/* @ts-ignore Server -> Client import allowed */}
          <PopularSellers />
        </div>
      </section>

      {/* Suggested sellers: personalized suggestions will be added later. */}
    </main>
  );
}