// src/components/HeroCarousel.tsx
"use client";

import { useEffect, useRef, useState } from "react";
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
      className="relative w-full overflow-hidden rounded-2xl border border-gray-200 bg-gray-950 shadow-sm min-h-[520px]"
    >
      {/* Background image (full-bleed) */}
      <div className="absolute inset-0">
        <SafeImage
          src={slide.image}
          alt={slide.title}
          className="h-full w-full object-cover object-bottom"
          loading="eager"
        />
        {/* Subtle left vignette for readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/35 to-transparent" aria-hidden="true" />
      </div>

      {/* Content */}
      <div className="relative z-10 h-full">
        <div className="mx-auto max-w-7xl h-full px-6 md:px-10">
          <div className="h-full flex items-center">
            <div className="max-w-xl">
              <h2 className="text-3xl md:text-6xl font-extrabold tracking-tight text-white">
                {slide.title}
              </h2>
              <p className="mt-3 md:mt-5 text-base md:text-lg text-white/85">
                {slide.blurb}
              </p>
              <div className="mt-6 flex items-center gap-3">
                {slide.href && (
                  <a
                    href={slide.href}
                    className="inline-flex items-center justify-center rounded-full bg-yellow-400 px-6 py-2.5 text-sm md:text-base font-semibold text-black hover:bg-yellow-300 transition"
                  >
                    {slide.ctaLabel ?? "Explore"}
                  </a>
                )}
                <a
                  href="/search"
                  className="inline-flex items-center justify-center rounded-full border border-white/25 bg-white/10 px-6 py-2.5 text-sm md:text-base font-medium text-white hover:bg-white/15 transition"
                >
                  Browse categories
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Prev/Next controls */}
      <div className="pointer-events-none absolute inset-y-0 left-0 right-0 flex items-center justify-between px-2">
        <button
          type="button"
          onClick={() => go(-1)}
          className="pointer-events-auto inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white ring-1 ring-white/25 backdrop-blur hover:bg-black/60 transition"
          aria-label="Previous slide"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => go(1)}
          className="pointer-events-auto inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white ring-1 ring-white/25 backdrop-blur hover:bg-black/60 transition"
          aria-label="Next slide"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[min(680px,90%)]">
        <div className="h-[3px] w-full rounded-full bg-white/20 overflow-hidden">
          <div
            className="h-full bg-yellow-400 transition-[width] duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-2 flex justify-center gap-2">
          {SLIDES.map((s, i) => (
            <button
              key={s.id}
              onClick={() => goTo(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={`h-1.5 w-5 rounded-full transition ${
                i === index ? "bg-yellow-400" : "bg-white/40 hover:bg-white/60"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
