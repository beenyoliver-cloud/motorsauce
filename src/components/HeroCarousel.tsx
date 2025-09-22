// src/components/HeroCarousel.tsx
"use client";

import { useEffect, useState } from "react";
import SafeImage from "@/components/SafeImage";

type Slide = {
  id: string;
  image: string;
  title: string;
  blurb: string;
  href?: string;
};

const SLIDES: Slide[] = [
  {
    id: "reg",
    image: "/images/race-car2.jpg", // change if you have a different filename
    title: "Search by Registration",
    blurb: "Enter your reg to instantly find parts that fit your vehicle.",
    href: "/registration",
  },
  {
    id: "oem",
    image: "/images/race-car1.jpg",
    title: "OEM & Aftermarket",
    blurb: "Quality parts from trusted sellers, all in one place.",
    href: "/categories/oem",
  },
  {
    id: "sell",
    image: "/images/race-car3.jpg",
    title: "Sell your parts in minutes",
    blurb: "List, message buyers, and get paid with ease.",
    href: "/sell",
  },
];

export default function HeroCarousel() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % SLIDES.length);
    }, 5000);
    return () => clearInterval(id);
  }, []);

  const slide = SLIDES[index];

  return (
    <section className="relative aspect-[16/6] w-full overflow-hidden rounded-2xl border border-gray-200 bg-gray-100">
      {/* Image */}
      <div className="absolute inset-0">
        <SafeImage
          src={slide.image}
          alt={slide.title}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-black/30" aria-hidden="true" />
      </div>

      {/* Text overlay */}
      <div className="relative z-10 h-full w-full flex items-center">
        <div className="px-6 md:px-10">
          <h2 className="text-2xl md:text-4xl font-extrabold text-white drop-shadow-sm">
            {slide.title}
          </h2>
          <p className="mt-2 max-w-xl text-sm md:text-base text-white/90">
            {slide.blurb}
          </p>

          {slide.href && (
            <a
              href={slide.href}
              className="mt-4 inline-flex items-center rounded-md bg-yellow-500 px-4 py-2 text-sm font-semibold text-black hover:bg-yellow-600"
            >
              Explore
            </a>
          )}
        </div>
      </div>

      {/* Dots */}
      <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2">
        {SLIDES.map((s, i) => (
          <button
            key={s.id}
            onClick={() => setIndex(i)}
            aria-label={`Go to slide ${i + 1}`}
            className={`h-2.5 w-2.5 rounded-full transition ${
              i === index ? "bg-white" : "bg-white/50 hover:bg-white/80"
            }`}
          />
        ))}
      </div>
    </section>
  );
}
