"use client";

import Link from "next/link";
import { Settings, Sparkles, Disc3, Container, Wind, Wrench } from "lucide-react";

const tiles = [
  {
    label: "OEM Parts",
    href: "/search?category=oem",
    icon: Settings,
    badge: "Factory matched",
    accentFrom: "#1e2540",
    accentTo: "#020617",
    image: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80",
  },
  {
    label: "Aftermarket",
    href: "/search?category=aftermarket",
    icon: Sparkles,
    badge: "Upgrade-ready",
    accentFrom: "#3b0764",
    accentTo: "#9333ea",
    image: "/images/race-car2.jpg",
  },
  {
    label: "Brakes",
    href: "/search?q=brake",
    icon: Disc3,
    badge: "Stop faster",
    accentFrom: "#450a0a",
    accentTo: "#dc2626",
    image: "https://images.unsplash.com/photo-1503736334956-4c8f8e92946d?auto=format&fit=crop&w=800&q=80",
  },
  {
    label: "Suspension",
    href: "/search?q=coilover",
    icon: Container,
    badge: "Track stance",
    accentFrom: "#052e16",
    accentTo: "#16a34a",
    image: "/images/shock4.jpeg",
  },
  {
    label: "Exhausts",
    href: "/search?q=exhaust",
    icon: Wind,
    badge: "Sound & flow",
    accentFrom: "#0f172a",
    accentTo: "#0284c7",
    image: "https://images.unsplash.com/photo-1493238792000-8113da705763?auto=format&fit=crop&w=800&q=80",
  },
  {
    label: "Tools & More",
    href: "/search?category=tools",
    icon: Wrench,
    badge: "Garage gear",
    accentFrom: "#312e81",
    accentTo: "#7c3aed",
    image: "https://images.unsplash.com/photo-1505739775417-85f52a1f7ffb?auto=format&fit=crop&w=800&q=80",
  },
];

export default function CategoryTiles() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 lg:grid-rows-2 gap-3 lg:h-[var(--home-tiles-block-height)]">
      {tiles.map((t, idx) => {
        const Icon = t.icon;
        return (
          <Link
            key={t.label}
            href={t.href}
            className="group relative overflow-hidden rounded-2xl p-3 sm:p-4 min-h-[130px] flex flex-col justify-between text-white shadow-lg hover:-translate-y-1 transition-all duration-300 animate-fadeInUp"
            style={{
              animationDelay: `${idx * 60}ms`,
              backgroundImage: `linear-gradient(135deg, ${t.accentFrom} 0%, ${t.accentTo} 70%), url(${t.image})`,
              backgroundSize: "cover",
              backgroundBlendMode: "soft-light",
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-black/30 via-black/10 to-black/50 pointer-events-none" />
            <div className="relative flex items-start justify-between gap-2 w-full">
              <div className="flex flex-col gap-1 min-w-0">
                <span className="text-[10px] uppercase tracking-[0.3em] text-white/70 whitespace-nowrap">
                  {t.badge}
                </span>
                <div className="inline-flex items-center gap-2">
                  <div className="rounded-full bg-white/15 p-2 border border-white/30 backdrop-blur-sm">
                    <Icon size={18} className="text-white" />
                  </div>
                  <h3 className="text-sm sm:text-base font-semibold text-white leading-snug break-words">
                    {t.label}
                  </h3>
                </div>
              </div>
              <span className="text-xs font-medium text-white/80 group-hover:text-white transition shrink-0">
                Go →
              </span>
            </div>
            <div className="relative mt-4">
              <div className="h-1 w-2/3 rounded-full bg-white/30 overflow-hidden">
                <div className="h-full rounded-full bg-white group-hover:w-full transition-all duration-500" />
              </div>
              <p className="mt-2 text-[11px] text-white/80 leading-snug break-words">
                Tap to jump into curated searches tuned to this category.
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
