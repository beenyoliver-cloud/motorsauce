// src/components/HeroCarousel.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import SafeImage from "@/components/SafeImage";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Slide = {
  id: string;
  image: string;
  title: string;
  blurb: string;
  href?: string;
  ctaLabel?: string;
};

const SLIDES: Slide[] = [
  {
    id: "reg",
    image: "/images/race-car2.jpg",
    title: "Search by Registration",
    blurb: "Enter your reg to instantly find parts that fit your vehicle.",
    href: "/registration",
    ctaLabel: "Find parts",
  },
  {
    id: "oem",
    image: "/images/race-car1.jpg",
    title: "OEM & Aftermarket",
    blurb: "Quality parts from trusted sellers, all in one place.",
    href: "/categories/oem",
    ctaLabel: "Browse OEM",
  },
  {
    id: "sell",
    image: "/images/race-car3.jpg",
    title: "Sell your parts in minutes",
    blurb: "List, message buyers, and get paid with ease.",
    href: "/sell",
    ctaLabel: "Start selling",
  },
];

const DURATION_MS = 5000;

export default function HeroCarousel() {
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0); // 0..100
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const slide = SLIDES[index];

  // Progress timer
  useEffect(() => {
    if (paused) return;
    if (timerRef.current) clearInterval(timerRef.current);
    const step = 100 / (DURATION_MS / 100);
    timerRef.current = setInterval(() => {
      setProgress((p) => {
        const np = p + step;
        if (np >= 100) {
          // advance slide
          setIndex((i) => (i + 1) % SLIDES.length);
          return 0;
        }
        return np;
      });
    }, 100);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [paused]);

  // Reset progress on index change
  useEffect(() => {
    setProgress(0);
  }, [index]);

  const go = (dir: -1 | 1) => {
    setIndex((i) => (i + dir + SLIDES.length) % SLIDES.length);
  };
  const goTo = (i: number) => {
    setIndex(i);
  };

  return (
    <section
      role="region"
      aria-label="Featured highlights"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") go(-1);
        if (e.key === "ArrowRight") go(1);
      }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={(e) => (touchStartX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        const start = touchStartX.current;
        if (start == null) return;
        const dx = e.changedTouches[0].clientX - start;
        if (Math.abs(dx) > 40) go(dx > 0 ? -1 : 1);
        touchStartX.current = null;
      }}
      className="relative w-full overflow-hidden rounded-2xl border border-gray-200 bg-gray-900 shadow-sm lg:min-h-[520px]"
    >
      {/* Mobile background image */}
      <div className="absolute inset-0 md:hidden">
        <SafeImage
          src={slide.image}
          alt={slide.title}
          className="h-full w-full object-cover object-center"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/20" aria-hidden="true" />
      </div>

      {/* Desktop layout: text left, image right */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-2">
        {/* Left: content */}
        <div className="flex items-center px-6 py-8 md:px-10 md:py-10 lg:py-16">
          <div className="w-full max-w-xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white ring-1 ring-white/20 backdrop-blur-sm">
              Motorsauce
              <span className="h-1 w-1 rounded-full bg-yellow-400" />
              Marketplace
            </span>
            <h2 className="mt-3 text-2xl md:text-5xl font-extrabold tracking-tight text-white drop-shadow-sm">
              {slide.title}
            </h2>
            <p className="mt-3 md:mt-4 text-sm md:text-lg text-white/90">
              {slide.blurb}
            </p>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              {slide.href && (
                <a
                  href={slide.href}
                  className="inline-flex items-center justify-center rounded-md bg-yellow-400 px-5 py-2.5 text-sm md:text-base font-semibold text-black shadow-[0_1px_0_rgba(0,0,0,0.2)] hover:bg-yellow-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/60 active:translate-y-[1px] transition"
                >
                  {slide.ctaLabel ?? "Explore"}
                </a>
              )}
              <a
                href="/search"
                className="inline-flex items-center justify-center rounded-md border border-white/30 bg-white/10 px-5 py-2.5 text-sm md:text-base font-medium text-white hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 transition"
              >
                Browse categories
              </a>
            </div>

            {/* Progress indicator (segments) */}
            <div className="mt-6 hidden md:flex items-center gap-2">
              {SLIDES.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => goTo(i)}
                  aria-label={`Go to slide ${i + 1}`}
                  className="group relative h-1.5 flex-1 rounded-full bg-white/15 overflow-hidden"
                >
                  <span
                    className="absolute left-0 top-0 h-full bg-yellow-400 transition-[width] duration-100"
                    style={{ width: i === index ? `${progress}%` : i < index ? "100%" : "0%" }}
                    aria-hidden="true"
                  />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: image on desktop */}
        <div className="relative hidden md:block">
          <div className="absolute inset-0 p-6 md:p-8 lg:p-10">
            <div className="relative h-full w-full rounded-xl ring-1 ring-white/10 overflow-hidden shadow-2xl">
              <SafeImage
                src={slide.image}
                alt={slide.title}
                className="h-full w-full object-cover object-bottom will-change-transform transition-transform duration-500 group-hover:scale-[1.02]"
                loading="eager"
              />
              <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/40 to-transparent" />
            </div>
          </div>
        </div>
      </div>

      {/* Prev/Next controls */}
      <div className="pointer-events-none absolute inset-y-0 left-0 right-0 hidden md:flex items-center justify-between px-2">
        <button
          type="button"
          onClick={() => go(-1)}
          className="pointer-events-auto inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white ring-1 ring-white/30 backdrop-blur hover:bg-black/60 transition"
          aria-label="Previous slide"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => go(1)}
          className="pointer-events-auto inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white ring-1 ring-white/30 backdrop-blur hover:bg-black/60 transition"
          aria-label="Next slide"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Mobile dots */}
      <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2 md:hidden">
        {SLIDES.map((s, i) => (
          <button
            key={s.id}
            onClick={() => goTo(i)}
            aria-label={`Go to slide ${i + 1}`}
            className={`h-2.5 w-2.5 rounded-full transition-all duration-300 ${
              i === index ? "bg-yellow-400 scale-110" : "bg-white/60 hover:bg-yellow-300"
            }`}
          />)
        )}
      </div>
    </section>
  );
}
