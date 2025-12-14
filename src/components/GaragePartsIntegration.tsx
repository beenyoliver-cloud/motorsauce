// src/components/GaragePartsIntegration.tsx
"use client";

import { useState, useEffect } from "react";
import { Car } from "@/lib/garage";
import { Search, Bell, BellOff, ExternalLink, Package } from "lucide-react";
import Link from "next/link";

interface GaragePartsIntegrationProps {
  car: Car;
}

interface CompatiblePart {
  id: string;
  title: string;
  price: number;
  seller: string;
  image?: string;
  category: string;
  listedAt: string;
}

export default function GaragePartsIntegration({ car }: GaragePartsIntegrationProps) {
  const [compatibleCount, setCompatibleCount] = useState<number | null>(null);
  const [watchEnabled, setWatchEnabled] = useState(car.watchParts || false);
  const [loading, setLoading] = useState(false);
  const [recentParts, setRecentParts] = useState<CompatiblePart[]>([]);

  useEffect(() => {
    // Fetch count of compatible parts
    fetchCompatibleCount();
  }, [car.make, car.model, car.year]);

  const fetchCompatibleCount = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        make: car.make,
        model: car.model,
        year: car.year,
        countOnly: "true",
      });
      
      const res = await fetch(`/api/listings?${params}`);
      if (res.ok) {
        const data = await res.json();
        setCompatibleCount(data.total || 0);
        
        // If we have parts, load a few recent ones
        if (data.total > 0) {
          fetchRecentParts();
        }
      }
    } catch (err) {
      console.error("Failed to fetch compatible parts count:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentParts = async () => {
    try {
      const params = new URLSearchParams({
        make: car.make,
        model: car.model,
        year: car.year,
        limit: "3",
        sort: "recent",
      });
      
      const res = await fetch(`/api/listings?${params}`);
      if (res.ok) {
        const data = await res.json();
        setRecentParts(data.listings || []);
      }
    } catch (err) {
      console.error("Failed to fetch recent parts:", err);
    }
  };

  const toggleWatch = async () => {
    const newValue = !watchEnabled;
    
    try {
      // Get auth token
      const { data: { session } } = await (await import("@/lib/supabase")).supabaseBrowser().auth.getSession();
      
      if (!session) {
        alert("Please sign in to enable watch alerts");
        return;
      }

      if (newValue) {
        // Add watch
        const res = await fetch("/api/watched-parts", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            make: car.make,
            model: car.model,
            year: car.year,
          }),
        });

        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || "Failed to enable watch");
        }

        setWatchEnabled(true);
        car.watchParts = true;
        alert(`Watch enabled for ${car.make} ${car.model} ${car.year}. You'll be notified when compatible parts are listed.`);
      } else {
        // Remove watch
        const res = await fetch(
          `/api/watched-parts?make=${encodeURIComponent(car.make)}&model=${encodeURIComponent(car.model)}&year=${car.year}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          }
        );

        if (!res.ok) {
          throw new Error("Failed to disable watch");
        }

        setWatchEnabled(false);
        car.watchParts = false;
      }
    } catch (err) {
      console.error("Failed to toggle watch:", err);
      alert(err instanceof Error ? err.message : "Failed to update watch status");
    }
  };

  const searchUrl = `/search?make=${encodeURIComponent(car.make)}&model=${encodeURIComponent(car.model)}&yearFrom=${car.year}&yearTo=${car.year}`;

  return (
    <div className="space-y-4">
      {/* Parts Counter */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-yellow-100 flex items-center justify-center">
              <Package className="h-5 w-5 text-yellow-700" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">Compatible Parts</h4>
              <p className="text-sm text-gray-600 mt-0.5">
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <div className="animate-spin h-3 w-3 border-2 border-gray-400 border-t-transparent rounded-full" />
                    Checking...
                  </span>
                ) : compatibleCount !== null ? (
                  <>
                    <span className="font-bold text-gray-900">{compatibleCount}</span> part
                    {compatibleCount !== 1 ? "s" : ""} available for your {car.year} {car.make} {car.model}
                  </>
                ) : (
                  "Checking marketplace..."
                )}
              </p>
            </div>
          </div>

          <button
            onClick={toggleWatch}
            className={`p-2 rounded-lg border transition-colors ${
              watchEnabled
                ? "bg-yellow-500 border-yellow-500 text-black hover:bg-yellow-600"
                : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
            }`}
            title={watchEnabled ? "Disable watch alerts" : "Enable watch alerts"}
          >
            {watchEnabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
          </button>
        </div>

        {compatibleCount !== null && compatibleCount > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <Link
              href={searchUrl}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-500 text-black font-semibold hover:bg-yellow-600 transition-colors"
            >
              <Search className="h-4 w-4" />
              Search for Parts
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        )}
      </div>

      {/* Recent Parts Preview */}
      {recentParts.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h4 className="font-semibold text-gray-900 mb-3">Recently Listed</h4>
          <div className="space-y-2">
            {recentParts.map((part) => (
              <Link
                key={part.id}
                href={`/listing/${part.id}`}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors group"
              >
                <div className="h-12 w-12 rounded-md bg-gray-100 flex items-center justify-center overflow-hidden shrink-0">
                  {part.image ? (
                    <img src={part.image} alt={part.title} className="w-full h-full object-cover" />
                  ) : (
                    <Package className="h-5 w-5 text-gray-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate group-hover:text-yellow-600">
                    {part.title}
                  </div>
                  <div className="text-xs text-gray-600">
                    {part.category} • {part.seller}
                  </div>
                </div>
                <div className="text-sm font-bold text-gray-900">
                  £{part.price.toFixed(2)}
                </div>
              </Link>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-gray-200">
            <Link
              href={searchUrl}
              className="text-sm text-yellow-600 hover:text-yellow-700 font-medium inline-flex items-center gap-1"
            >
              View all {compatibleCount} parts
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>
      )}

      {/* Watch Alerts Info */}
      {watchEnabled && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
          <div className="flex items-start gap-2">
            <Bell className="h-4 w-4 text-yellow-700 mt-0.5" />
            <div className="text-xs text-yellow-800">
              <strong>Watch enabled:</strong> You&apos;ll be notified when new compatible parts are listed for your {car.year} {car.make} {car.model}.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
