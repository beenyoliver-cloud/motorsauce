"use client";

import { Shield, Award } from "lucide-react";

export function trustLevel(sold: number | undefined | null): "none" | "bronze" | "silver" | "gold" {
  const n = Number(sold || 0);
  if (n >= 200) return "gold";
  if (n >= 50) return "silver";
  if (n >= 10) return "bronze";
  return "none";
}

export default function TrustBadge({ soldCount }: { soldCount?: number | null }) {
  const lvl = trustLevel(soldCount);
  if (lvl === "none") return null;
  const styles = {
    bronze: "bg-amber-100 text-amber-800 border-amber-200",
    silver: "bg-gray-100 text-gray-800 border-gray-300",
    gold: "bg-yellow-100 text-yellow-800 border-yellow-300",
  } as const;
  const label = lvl === "gold" ? "Gold" : lvl === "silver" ? "Silver" : "Bronze";
  const Icon = lvl === "gold" ? Award : Shield;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] border ${styles[lvl]}`} title={`${label} seller (sold ${soldCount ?? 0})`}>
      <Icon size={12} /> {label}
    </span>
  );
}
