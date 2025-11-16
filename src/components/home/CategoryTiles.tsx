"use client";

import Link from "next/link";
import { Wrench, CarFront, Sparkles, Gauge, Disc, Cog } from "lucide-react";

const tiles = [
  { label: "OEM Parts", href: "/search?category=OEM", icon: CarFront },
  { label: "Aftermarket", href: "/search?category=Aftermarket", icon: Sparkles },
  { label: "Brakes", href: "/search?q=brake", icon: Disc },
  { label: "Suspension", href: "/search?q=coilover", icon: Gauge },
  { label: "Exhausts", href: "/search?q=exhaust", icon: Wrench },
  { label: "Tools & More", href: "/search?category=Tool", icon: Cog },
];

export default function CategoryTiles() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
      {tiles.map((t, idx) => {
        const Icon = t.icon;
        return (
          <Link
            key={t.label}
            href={t.href}
            className="group rounded-xl border border-gray-200 bg-white p-3 sm:p-4 flex flex-col items-center text-center hover:shadow-lg hover:border-yellow-400 transition-all duration-300 transform hover:-translate-y-1 hover:scale-105 animate-fadeInUp"
            style={{ animationDelay: `${idx * 50}ms` }}
          >
            <div className="rounded-lg bg-gray-50 border border-gray-200 p-2 mb-2 group-hover:bg-yellow-50 group-hover:border-yellow-400 transition-all duration-300">
              <Icon size={20} className="text-gray-700 group-hover:text-yellow-600 transition-colors duration-300" />
            </div>
            <div className="text-xs sm:text-sm font-semibold text-gray-900 group-hover:text-yellow-600 transition-colors duration-300">{t.label}</div>
          </Link>
        );
      })}
    </div>
  );
}
