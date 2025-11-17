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
    <section
      className="relative w-full overflow-hidden rounded-2xl border border-gray-200 bg-gray-900
      aspect-[4/3] sm:aspect-[16/9] md:aspect-[5/2]
      lg:min-h-[480px] lg:aspect-auto"
    >
      {/* Image */}
      <div className="absolute inset-0">
        <SafeImage
          src={slide.image}
          alt={slide.title}
          /* Show more of the subject by anchoring to the top */
          className="h-full w-full object-cover object-top"
          loading="eager"
        />
        {/* Add subtle gradient to ensure bottom content never looks hard-cropped */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-black/50" aria-hidden="true" />
      </div>

      {/* Text overlay */}
      <div className="relative z-10 h-full w-full flex items-center justify-start">
        <div className="px-6 md:px-10 max-w-2xl">
          <h2 className="text-2xl md:text-5xl font-extrabold text-white drop-shadow-sm animate-fadeIn text-left">
            {slide.title}
          </h2>
          <p className="mt-3 md:mt-4 text-sm md:text-lg text-white/90 animate-fadeIn text-left" style={{ animationDelay: '100ms' }}>
            {slide.blurb}
          </p>

          {slide.href && (
            <a
              href={slide.href}
              className="mt-6 inline-flex items-center justify-center rounded-md bg-yellow-500 px-5 py-2.5 text-sm md:text-base font-semibold text-black hover:bg-yellow-400 hover:shadow-lg transition-all duration-300 transform hover:scale-105 active:scale-95 animate-fadeIn"
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
