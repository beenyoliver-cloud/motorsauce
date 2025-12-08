"use client";

import Link from "next/link";
import { Settings, Sparkles, Disc3, Container, Wind, Wrench } from "lucide-react";

const tiles = [
  { label: "OEM Parts", href: "/search?category=OEM", icon: Settings },
  { label: "Aftermarket", href: "/search?category=Aftermarket", icon: Sparkles },
  { label: "Brakes", href: "/search?q=brake", icon: Disc3 },
  { label: "Suspension", href: "/search?q=coilover", icon: Container },
  { label: "Exhausts", href: "/search?q=exhaust", icon: Wind },
  { label: "Tools & More", href: "/search?category=Tool", icon: Wrench },
];

export default function CategoryTiles() {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
      {tiles.map((t, idx) => {
        const Icon = t.icon;
        return (
          <Link
            key={t.label}
            href={t.href}
            className="group rounded-lg border border-gray-200 bg-white p-2 sm:p-3 flex flex-col items-center text-center hover:shadow-md hover:border-yellow-400 transition-all duration-200 hover:-translate-y-0.5 animate-fadeInUp"
            style={{ animationDelay: `${idx * 50}ms` }}
          >
            <div className="rounded-md bg-gray-50 border border-gray-200 p-1.5 sm:p-2 mb-1.5 sm:mb-2 group-hover:bg-yellow-50 group-hover:border-yellow-400 transition-all duration-200">
              <Icon size={16} className="sm:size-[18px] text-gray-700 group-hover:text-yellow-600 transition-colors duration-200" />
            </div>
            <div className="text-[11px] sm:text-xs font-semibold text-gray-900 group-hover:text-yellow-600 transition-colors duration-200 leading-tight">{t.label}</div>
          </Link>
        );
      })}
    </div>
  );
}
