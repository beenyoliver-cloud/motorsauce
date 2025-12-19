// src/components/category/PartsForYourCar.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Car, ArrowRight } from "lucide-react";
import { loadMyCars, type Car as GarageCar } from "@/lib/garage";

type Props = {
  category: "oem" | "aftermarket" | "OEM" | "Aftermarket";
};

export default function PartsForYourCar({ category }: Props) {
  const [car, setCar] = useState<GarageCar | null>(null);
  const [loading, setLoading] = useState(true);
  const normalizedCategory = category.toLowerCase() as "oem" | "aftermarket";

  useEffect(() => {
    const loadGarage = () => {
      try {
        const cars = loadMyCars();
        // Get the first car in the garage
        setCar(cars[0] || null);
      } catch (err) {
        console.error("Failed to load garage:", err);
      } finally {
        setLoading(false);
      }
    };

    loadGarage();
  }, []);

  if (loading) {
    return (
      <section className="mt-10">
        <div className="h-24 bg-gray-100 rounded-xl animate-pulse" />
      </section>
    );
  }

  if (!car) {
    // No car in garage - show prompt to add one
    return (
      <section className="mt-10">
        <div className="rounded-2xl border-2 border-dashed border-yellow-300 bg-yellow-50/50 p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-100">
                <Car className="h-6 w-6 text-yellow-700" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">
                  Find {category === "oem" ? "OEM" : "aftermarket"} parts for your car
                </h3>
                <p className="text-sm text-gray-600">
                  Add your vehicle to see compatible parts
                </p>
              </div>
            </div>
            <Link
              href="/profile/me#garage"
              className="inline-flex items-center gap-2 rounded-lg bg-yellow-500 hover:bg-yellow-600 text-black font-semibold px-4 py-2 text-sm transition-colors"
            >
              Add your car
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    );
  }

  // Build search URL with car's make, model, year
  const categoryParam = normalizedCategory === "oem" ? "OEM" : "Aftermarket";
  const searchParams = new URLSearchParams({ category: categoryParam });
  if (car.make) searchParams.set("make", car.make);
  if (car.model) searchParams.set("model", car.model);
  if (car.year) {
    searchParams.set("yearMin", String(car.year));
    searchParams.set("yearMax", String(car.year));
  }
  const searchUrl = `/search?${searchParams.toString()}`;

  const carLabel = [car.year, car.make, car.model].filter(Boolean).join(" ");

  return (
    <section className="mt-10">
      <div className="rounded-2xl border border-yellow-200 bg-gradient-to-r from-yellow-50 to-white p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-100 ring-2 ring-yellow-300">
              <Car className="h-6 w-6 text-yellow-700" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">
                {normalizedCategory === "oem" ? "OEM" : "Aftermarket"} parts for your {carLabel}
              </h3>
              <p className="text-sm text-gray-600">
                Browse parts that fit your vehicle
              </p>
            </div>
          </div>
          <Link
            href={searchUrl}
            className="inline-flex items-center gap-2 rounded-lg bg-yellow-500 hover:bg-yellow-600 text-black font-semibold px-5 py-2.5 text-sm transition-colors shadow-sm"
          >
            Browse parts
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
