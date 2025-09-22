// src/app/page.tsx
"use client";

import Link from "next/link";
import HeroCarousel from "@/components/HeroCarousel";
import SafeImage from "@/components/SafeImage";
import {
  WrenchIcon,
  Cog6ToothIcon,
  MagnifyingGlassIcon,
  IdentificationIcon,
  Squares2X2Icon,
} from "@heroicons/react/24/solid";
import { ReactNode, useEffect, useRef, useState } from "react";
import { listings } from "@/data/listings";
import { getSoldIds, onSoldChange } from "@/lib/soldStore";

/* ---------------- Scroll-fade hook (used only inside child component) --------- */
function useScrollFade() {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setIsVisible(true);
    }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.unobserve(el);
  }, []);

  return { ref, isVisible };
}

/* --------- Wrapper so we never call hooks inside .map() in HomePage ---------- */
function FadeInOnView({ children, className = "" }: { children: ReactNode; className?: string }) {
  const { ref, isVisible } = useScrollFade();
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 transform ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"} ${className}`}
    >
      {children}
    </div>
  );
}

/* ---------------------------------- Data -------------------------------------- */
const categories = [
  { name: "OEM Parts", href: "/categories/oem", icon: WrenchIcon },
  { name: "Aftermarket Parts", href: "/categories/aftermarket", icon: Cog6ToothIcon },
  { name: "Compatibility Search", href: "/categories/compatibility", icon: MagnifyingGlassIcon },
  { name: "Search by Registration", href: "/registration", icon: IdentificationIcon },
  { name: "Tools & Accessories", href: "/categories/tools", icon: Squares2X2Icon },
];

const featuredSellers = [
  { name: "AutoJoe", avatar: "/images/seller1.jpg", rating: 4.8, totalListings: 24 },
  { name: "WheelMaster", avatar: "/images/seller2.jpg", rating: 4.5, totalListings: 18 },
  { name: "ScanPro", avatar: "/images/seller3.jpg", rating: 4.9, totalListings: 32 },
  { name: "FilterKing", avatar: "/images/seller4.jpg", rating: 4.6, totalListings: 12 },
];

/* --------------------------------- Page --------------------------------------- */
export default function HomePage() {
  // ✅ Keep sold IDs in state and react to changes
  const [soldIds, setSoldIds] = useState<string[]>([]);

  useEffect(() => {
    // initial read
    setSoldIds(getSoldIds());
    // subscribe to future changes (checkout success, other tabs, etc.)
    const unsub = onSoldChange(() => setSoldIds(getSoldIds()));
    return unsub;
  }, []);

  const recent = [...listings]
    .filter((l) => !soldIds.includes(l.id))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8);

  return (
    <div className="bg-white text-black pb-12">
      {/* Hero / Carousel */}
      <HeroCarousel />

      {/* Categories */}
      <section className="px-6 sm:px-8 md:px-12 py-12">
        <h2 className="text-2xl font-bold mb-2 text-center">Shop by Category</h2>
        <p className="text-center text-gray-600 mb-8 max-w-[600px] mx-auto">
          Explore our main categories to find the parts you need quickly.
        </p>

        <div className="grid max-w-[1200px] mx-auto grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-8">
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <FadeInOnView key={category.href}>
                <Link
                  href={category.href}
                  className="block rounded-xl border border-gray-200 bg-white hover:shadow-lg hover:border-yellow-500 transition"
                >
                  <div className="aspect-square flex flex-col items-center justify-center p-4">
                    <Icon className="h-10 w-10 mb-2 text-yellow-500" />
                    <div className="text-base font-medium text-center leading-snug">
                      {category.name}
                    </div>
                  </div>
                </Link>
              </FadeInOnView>
            );
          })}
        </div>
      </section>

      {/* Featured Sellers */}
      <section className="px-6 sm:px-8 md:px-12 py-12">
        <h2 className="text-2xl font-bold mb-2 text-center">Featured Sellers</h2>
        <p className="text-center text-gray-600 mb-8 max-w-[600px] mx-auto">
          Browse our top sellers and discover trusted parts from the community.
        </p>
        <div className="grid max-w-[1200px] mx-auto grid-cols-2 sm:grid-cols-4 gap-6">
          {featuredSellers.map((seller) => (
            <FadeInOnView key={seller.name}>
              <Link
                href={`/profile/${encodeURIComponent(seller.name)}`}
                className="flex flex-col items-center p-4 border border-gray-200 rounded-lg bg-white hover:shadow-lg hover:scale-105 transition transform duration-300"
              >
                <SafeImage
                  src={seller.avatar}
                  alt={seller.name}
                  className="h-16 w-16 rounded-full object-cover mb-2"
                  loading="lazy"
                />
                <div className="text-center">
                  <h3 className="text-lg font-semibold">{seller.name}</h3>
                  <p className="text-yellow-500 font-bold">⭐ {seller.rating}</p>
                  <p className="text-gray-600 text-sm">{seller.totalListings} listings</p>
                </div>
              </Link>
            </FadeInOnView>
          ))}
        </div>
      </section>

      {/* Recent Listings (data-driven) */}
      <section className="px-6 sm:px-8 md:px-12 py-12">
        <h2 className="text-2xl font-bold mb-2 text-center">Recent Listings</h2>
        <p className="text-center text-gray-600 mb-8 max-w-[600px] mx-auto">
          See the latest parts listed by our community.
        </p>
        <div className="grid max-w-[1200px] mx-auto grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          {recent.map((l) => (
            <FadeInOnView key={l.id} className="relative">
              <span
                className={`absolute top-2 left-2 text-xs font-bold px-2 py-1 rounded z-10 ${
                  l.category === "OEM"
                    ? "bg-yellow-500 text-black"
                    : l.category === "Aftermarket"
                    ? "bg-black text-white"
                    : "bg-gray-200 text-gray-900"
                }`}
              >
                {l.category}
              </span>

              <Link
                href={`/listing/${l.id}`}
                className="block border border-gray-200 rounded-lg overflow-hidden bg-white hover:shadow-xl hover:scale-105 transition transform duration-300"
              >
                <SafeImage src={l.image} alt={l.title} className="w-full h-44 object-cover" loading="lazy" />
                <div className="p-3">
                  <h3 className="text-lg font-semibold line-clamp-2">{l.title}</h3>
                  <p className="mt-1 text-yellow-500 font-bold">{l.price}</p>
                  <div className="flex items-center mt-2">
                    <SafeImage
                      src={l.seller.avatar}
                      alt={l.seller.name}
                      className="h-6 w-6 rounded-full object-cover mr-2"
                      loading="lazy"
                    />
                    <div className="text-sm text-gray-700">
                      {l.seller.name} • ⭐ {l.seller.rating}
                    </div>
                  </div>
                </div>
              </Link>
            </FadeInOnView>
          ))}
        </div>
      </section>
    </div>
  );
}
