"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { User, Package, MapPin, Star } from "lucide-react";

type SearchTab = "all" | "parts" | "sellers";

type Props = {
  activeTab: SearchTab;
  partsCount: number;
  sellersCount: number;
  onChange: (tab: SearchTab) => void;
};

export default function SearchTabs({ activeTab, partsCount, sellersCount, onChange }: Props) {
  const totalCount = partsCount + sellersCount;

  const tabs: Array<{ id: SearchTab; label: string; count: number; icon: React.ReactNode }> = [
    {
      id: "all",
      label: "All",
      count: totalCount,
      icon: <Package size={16} />,
    },
    {
      id: "parts",
      label: "Parts",
      count: partsCount,
      icon: <Package size={16} />,
    },
    {
      id: "sellers",
      label: "Sellers",
      count: sellersCount,
      icon: <User size={16} />,
    },
  ];

  return (
    <div className="border-b border-gray-200 bg-white rounded-t-xl overflow-hidden">
      <div className="flex items-center gap-1 p-1">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition ${
                isActive
                  ? "bg-gray-100 text-gray-900"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              {tab.icon}
              {tab.label}
              <span
                className={`ml-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                  isActive ? "bg-yellow-100 text-yellow-800" : "bg-gray-200 text-gray-700"
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
