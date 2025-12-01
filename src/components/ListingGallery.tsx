"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut } from "lucide-react";
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
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
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

  const openZoom = () => {
    setIsZoomed(true);
    setZoomLevel(1);
    document.body.style.overflow = "hidden";
  };

  const closeZoom = () => {
    setIsZoomed(false);
    setZoomLevel(1);
    document.body.style.overflow = "";
  };

  const zoomIn = () => setZoomLevel((z) => Math.min(z + 0.5, 3));
  const zoomOut = () => setZoomLevel((z) => Math.max(z - 0.5, 1));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isZoomed) {
        if (e.key === "Escape") closeZoom();
        if (e.key === "ArrowRight" && canNext) next();
        if (e.key === "ArrowLeft" && canPrev) prev();
        if (e.key === "+" || e.key === "=") zoomIn();
        if (e.key === "-") zoomOut();
      } else {
        if (e.key === "ArrowRight" && canNext) next();
        if (e.key === "ArrowLeft" && canPrev) prev();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [canPrev, canNext, isZoomed]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

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
    <>
      <div className={`w-full ${className}`} ref={containerRef}>
        {/* Main image */}
        <div className="relative aspect-[4/3] bg-gray-50 border border-gray-200 rounded-xl overflow-hidden select-none group">
          <button
            type="button"
            onClick={openZoom}
            className="absolute inset-0 cursor-zoom-in z-10"
            aria-label="Click to zoom"
          >
            <SafeImage
              src={images[i]}
              alt={`${altBase} — image ${i + 1} of ${total}`}
              className={`h-full w-full object-cover ${prefersReducedMotion ? "" : "transition-all"} duration-300 group-hover:scale-105`}
            />
          </button>
          {/* Zoom hint overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-300 pointer-events-none flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white/90 rounded-full p-3 shadow-lg">
              <ZoomIn className="h-6 w-6 text-gray-900" />
            </div>
          </div>
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

    {/* Zoom Modal */}
    {isZoomed && (
      <div 
        className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
        onClick={closeZoom}
      >
        {/* Controls bar */}
        <div className="absolute top-0 left-0 right-0 h-16 bg-black/50 flex items-center justify-between px-4 z-10">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                zoomOut();
              }}
              disabled={zoomLevel <= 1}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Zoom out"
            >
              <ZoomOut className="h-5 w-5 text-white" />
            </button>
            <span className="text-white text-sm font-medium">{Math.round(zoomLevel * 100)}%</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                zoomIn();
              }}
              disabled={zoomLevel >= 3}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Zoom in"
            >
              <ZoomIn className="h-5 w-5 text-white" />
            </button>
          </div>
          <div className="text-white text-sm">
            {i + 1} / {total}
          </div>
          <button
            type="button"
            onClick={closeZoom}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            aria-label="Close zoom view"
          >
            <X className="h-5 w-5 text-white" />
          </button>
        </div>

        {/* Image container */}
        <div 
          className="relative w-full h-full flex items-center justify-center overflow-auto p-16"
          onClick={(e) => e.stopPropagation()}
        >
          <img
            src={images[i]}
            alt={`${altBase} — image ${i + 1} of ${total}`}
            style={{ 
              transform: `scale(${zoomLevel})`,
              transition: 'transform 0.3s ease-out',
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain'
            }}
            className="select-none"
          />
        </div>

        {/* Navigation arrows */}
        {canPrev && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              prev();
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
            aria-label="Previous image"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}
        {canNext && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              next();
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
            aria-label="Next image"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        )}

        {/* Thumbnails at bottom */}
        {images.length > 1 && (
          <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-2 px-4">
            <div className="flex gap-2 overflow-x-auto max-w-2xl px-4 py-2 bg-black/50 rounded-lg">
              {images.map((src, idx) => (
                <button
                  key={src + idx}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    go(idx);
                  }}
                  className={`relative flex-shrink-0 w-16 h-16 rounded-lg border-2 overflow-hidden transition-all ${
                    idx === i ? "border-yellow-500 ring-2 ring-yellow-300" : "border-white/30 hover:border-white/60"
                  }`}
                  aria-label={`Go to image ${idx + 1}`}
                >
                  <img src={src} alt="" className="site-image" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    )}
    </>
  );
}
