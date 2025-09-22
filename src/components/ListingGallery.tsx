"use client";

import { useEffect, useMemo, useState } from "react";
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

  return (
    <div className={`w-full ${className}`}>
      {/* Main image */}
      <div className="relative aspect-[4/3] bg-gray-50 border border-gray-200 rounded-xl overflow-hidden">
        <SafeImage
          src={images[i]}
          alt={`${altBase} — image ${i + 1} of ${total}`}
          className={`h-full w-full object-cover ${prefersReducedMotion ? "" : "transition-transform"} duration-300`}
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
        {/* Counter */}
        <div className="absolute bottom-2 right-2 text-xs px-2 py-1 rounded bg-black/60 text-white">
          {i + 1}/{total}
        </div>
      </div>

      {/* Thumbs */}
      {images.length > 1 && (
        <div className="mt-3 grid grid-cols-5 gap-2">
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
