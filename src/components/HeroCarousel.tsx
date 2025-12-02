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

// Use three latest uploaded images placed in public/uploads
// If you replace these files, the carousel will show your new images automatically.
const SLIDES: Slide[] = [
  {
    id: "hero-11",
    image: "/uploads/Hero11.png",
    title: "Find parts that fit",
    blurb: "Search by vehicle or number plate and shop trusted sellers.",
    href: "/registration",
  },
  {
    id: "hero-12",
    image: "/uploads/Hero12.png",
    title: "OEM and aftermarket",
    blurb: "Quality parts with clear fitment and price history.",
    href: "/categories/oem",
  },
  {
    id: "hero-13",
    image: "/uploads/Hero13.png",
    title: "Sell your parts fast",
    blurb: "Create a listing in minutes and chat with buyers.",
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
    <section className="relative aspect-[4/3] sm:aspect-[16/9] md:aspect-[5/2] w-full overflow-hidden rounded-2xl border border-gray-200 bg-gray-900">
      {/* Image */}
      <div className="absolute inset-0">
        <SafeImage
          src={slide.image}
          alt={slide.title}
          className="h-full w-full object-cover object-bottom"
          loading="eager"
        />
        <div className="absolute inset-0 bg-black/30" aria-hidden="true" />
      </div>

      {/* Text overlay */}
      <div className="relative z-10 h-full w-full flex items-center">
        <div className="px-6 md:px-10">
          <h2 className="text-2xl md:text-4xl font-extrabold text-white drop-shadow-sm animate-fadeIn">
            {slide.title}
          </h2>
          <p className="mt-2 max-w-xl text-sm md:text-base text-white/90 animate-fadeIn" style={{ animationDelay: '100ms' }}>
            {slide.blurb}
          </p>

          {slide.href && (
            <a
              href={slide.href}
              className="mt-4 inline-flex items-center rounded-md bg-yellow-500 px-4 py-2 text-sm font-semibold text-black hover:bg-yellow-400 hover:shadow-lg transition-all duration-300 transform hover:scale-105 active:scale-95 animate-fadeIn"
              style={{ animationDelay: '200ms' }}
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
            className={`h-2.5 w-2.5 rounded-full transition-all duration-300 transform hover:scale-125 ${
              i === index ? "bg-yellow-400 w-8 shadow-lg" : "bg-white/50 hover:bg-yellow-300"
            }`}
          />
        ))}
      </div>
    </section>
  );
}
