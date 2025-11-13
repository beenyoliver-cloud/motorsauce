"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import SafeImage from "@/components/SafeImage";

export default function ListingGallery({
  images,
  altBase,
  className = "",
}: {
  images: string[];
  altBase: string;
  className?: string;
}) {
  const [i, setI] = useState(0);
  const total = images.length;
  const canPrev = i > 0;
  const canNext = i < total - 1;

  const prefersReducedMotion = useMemo(
    () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
    []
  );

  const prev = () => setI((p) => Math.max(0, p - 1));
  const next = () => setI((p) => Math.min(total - 1, p + 1));
  const go = (idx: number) => setI(idx);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" && canNext) next();
      if (e.key === "ArrowLeft" && canPrev) prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [canPrev, canNext]);

  // Swipe support (mobile)
  const startX = useRef<number | null>(null);
  const deltaX = useRef(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    function onStart(e: TouchEvent | PointerEvent | MouseEvent) {
      const x = (e as TouchEvent).touches?.[0]?.clientX ?? (e as PointerEvent).clientX ?? (e as MouseEvent).clientX;
      startX.current = x;
      deltaX.current = 0;
    }
    function onMove(e: TouchEvent | PointerEvent | MouseEvent) {
      if (startX.current == null) return;
      const x = (e as TouchEvent).touches?.[0]?.clientX ?? (e as PointerEvent).clientX ?? (e as MouseEvent).clientX;
      deltaX.current = x - startX.current;
    }
    function onEnd() {
      if (startX.current == null) return;
      const threshold = 40; // minimal swipe distance
      if (deltaX.current > threshold && canPrev) prev();
      else if (deltaX.current < -threshold && canNext) next();
      startX.current = null;
      deltaX.current = 0;
    }
    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: true });
    el.addEventListener("touchend", onEnd);
    el.addEventListener("pointerdown", onStart);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onEnd);
    el.addEventListener("pointerleave", onEnd);
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("pointerdown", onStart);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onEnd);
      el.removeEventListener("pointerleave", onEnd);
    };
  }, [canPrev, canNext]);

  return (
    <div className={`w-full ${className}`} ref={containerRef}>
      {/* Main image */}
      <div className="relative aspect-[4/3] bg-gray-50 border border-gray-200 rounded-xl overflow-hidden select-none">
        <SafeImage
          src={images[i]}
          alt={`${altBase} — image ${i + 1} of ${total}`}
          className={`h-full w-full object-cover ${prefersReducedMotion ? "" : "transition-opacity"} duration-300`}
        />
        {/* Arrows */}
        <button
          type="button"
          onClick={prev}
          disabled={!canPrev}
          aria-label="Previous image"
          className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 text-white hover:bg-black/60 disabled:opacity-40"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={next}
          disabled={!canNext}
          aria-label="Next image"
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 text-white hover:bg-black/60 disabled:opacity-40"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
        {/* Dot indicators */}
        {images.length > 1 && (
          <div className="absolute bottom-2 left-0 right-0 flex items-center justify-center gap-1">
            {images.map((_, idx) => (
              <button
                key={idx}
                aria-label={`Go to image ${idx + 1}`}
                onClick={() => go(idx)}
                className={`h-2 w-2 rounded-full ${idx === i ? "bg-yellow-500" : "bg-black/30"}`}
              />
            ))}
          </div>
        )}
        {/* Counter (desktop only) */}
        <div className="hidden md:block absolute bottom-2 right-2 text-xs px-2 py-1 rounded bg-black/60 text-white">
          {i + 1}/{total}
        </div>
      </div>

      {/* Thumbs (hide on very small screens) */}
      {images.length > 1 && (
        <div className="mt-3 hidden xs:grid grid-cols-5 gap-2">
          {images.map((src, idx) => (
            <button
              key={src + idx}
              type="button"
              aria-label={`Show image ${idx + 1}`}
              onClick={() => go(idx)}
              className={`relative overflow-hidden rounded-lg border ${
                idx === i ? "border-yellow-500 ring-2 ring-yellow-300" : "border-gray-200"
              }`}
            >
              <SafeImage src={src} alt={`${altBase} thumbnail ${idx + 1}`} className="h-16 w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
