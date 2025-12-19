// src/components/category/RecentlySold.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Clock, Tag } from "lucide-react";

type SoldItem = {
  id: string;
  title: string;
  price: number;
  soldAt: string;
  image: string | null;
};

type Props = {
  category: "oem" | "aftermarket" | "tools" | "OEM" | "Aftermarket" | "Tools";
};

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return `${Math.floor(diffDays / 30)} months ago`;
}

export default function RecentlySold({ category }: Props) {
  const [items, setItems] = useState<SoldItem[]>([]);
  const [loading, setLoading] = useState(true);
  const normalizedCategory = category.toLowerCase();

  useEffect(() => {
    const fetchSold = async () => {
      try {
        const res = await fetch(`/api/categories/stats?category=${normalizedCategory}`);
        if (res.ok) {
          const data = await res.json();
          setItems(data.recentlySold || []);
        }
      } catch (err) {
        console.error("Failed to fetch recently sold:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSold();
  }, [normalizedCategory]);

  if (loading) {
    return (
      <section className="mt-10">
        <h2 className="text-xl md:text-2xl font-bold text-black mb-4">Recently sold</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-32 bg-gray-100 rounded-xl" />
          ))}
        </div>
      </section>
    );
  }

  if (items.length === 0) return null;

  return (
    <section className="mt-10">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="h-5 w-5 text-yellow-600" />
        <h2 className="text-xl md:text-2xl font-bold text-black">Recently sold</h2>
        <span className="text-sm text-gray-500 ml-2">Price guide</span>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="group rounded-xl border border-gray-200 bg-white overflow-hidden hover:shadow-md transition-shadow"
          >
            {/* Image */}
            <div className="aspect-square bg-gray-100 relative overflow-hidden">
              {item.image ? (
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Tag className="h-8 w-8 text-gray-300" />
                </div>
              )}
              {/* Sold badge */}
              <div className="absolute top-1 right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                SOLD
              </div>
            </div>
            
            {/* Info */}
            <div className="p-2">
              <div className="text-sm font-semibold text-gray-900 truncate">{item.title}</div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-sm font-bold text-green-600">£{item.price.toLocaleString()}</span>
                <span className="text-[10px] text-gray-400">{timeAgo(item.soldAt)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
