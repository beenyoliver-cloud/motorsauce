"use client";

import { useState, useEffect } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import SafeImage from "./SafeImage";

interface ListingImageGalleryProps {
  images: string[];
  title: string;
}

export default function ListingImageGallery({ images, title }: ListingImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Lock body scroll when fullscreen is open
  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";
    } else {
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
    };
  }, [isFullscreen]);

  // Handle keyboard navigation in fullscreen
  useEffect(() => {
    if (!isFullscreen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsFullscreen(false);
      } else if (e.key === "ArrowLeft") {
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
      } else if (e.key === "ArrowRight") {
        setSelectedIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen, images.length]);

  const goToPrevious = () => {
    setSelectedIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  };

  const goToNext = () => {
    setSelectedIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  };

  return (
    <>
      <div>
        {/* Main image - clickable to open fullscreen */}
        <button
          onClick={() => setIsFullscreen(true)}
          className="aspect-[4/3] w-full overflow-hidden rounded-lg sm:rounded-xl border border-gray-200 bg-gray-50 cursor-zoom-in hover:opacity-95 transition-opacity"
        >
          <SafeImage
            src={images[selectedIndex]}
            alt={title}
            className="h-full w-full object-contain"
            loading="eager"
          />
        </button>

        {/* Thumbnail grid */}
        {images.length > 1 && (
          <div className="mt-3 grid grid-cols-5 gap-2">
            {images.map((img, i) => (
              <button
                key={`${img}-${i}`}
                onClick={() => setSelectedIndex(i)}
                className={`aspect-square overflow-hidden rounded-lg border-2 bg-white transition-all ${
                  i === selectedIndex
                    ? "border-yellow-500 ring-2 ring-yellow-300"
                    : "border-gray-200 hover:border-gray-400"
                }`}
              >
                <SafeImage
                  src={img}
                  alt={`${title} thumbnail ${i + 1}`}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Fullscreen Modal */}
      {isFullscreen && (
        <div className="fixed inset-0 z-[200] bg-black flex items-center justify-center">
          {/* Close button */}
          <button
            onClick={() => setIsFullscreen(false)}
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
            aria-label="Close fullscreen"
          >
            <X size={24} />
          </button>

          {/* Image counter */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 px-4 py-2 rounded-full bg-black/50 text-white text-sm font-medium">
            {selectedIndex + 1} / {images.length}
          </div>

          {/* Previous button */}
          {images.length > 1 && (
            <button
              onClick={goToPrevious}
              className="absolute left-4 z-10 p-3 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
              aria-label="Previous image"
            >
              <ChevronLeft size={28} />
            </button>
          )}

          {/* Main fullscreen image */}
          <div className="w-full h-full flex items-center justify-center p-4">
            <SafeImage
              src={images[selectedIndex]}
              alt={`${title} - Image ${selectedIndex + 1}`}
              className="max-w-full max-h-full object-contain"
              loading="eager"
            />
          </div>

          {/* Next button */}
          {images.length > 1 && (
            <button
              onClick={goToNext}
              className="absolute right-4 z-10 p-3 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
              aria-label="Next image"
            >
              <ChevronRight size={28} />
            </button>
          )}

          {/* Thumbnail strip at bottom */}
          {images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex gap-2 overflow-x-auto max-w-[90vw] px-4 scrollbar-hide">
              {images.map((img, i) => (
                <button
                  key={`fullscreen-thumb-${i}`}
                  onClick={() => setSelectedIndex(i)}
                  className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                    i === selectedIndex
                      ? "border-yellow-500 ring-2 ring-yellow-300 scale-110"
                      : "border-white/50 hover:border-white"
                  }`}
                >
                  <SafeImage
                    src={img}
                    alt={`Thumbnail ${i + 1}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          )}

          {/* Touch/Swipe area for mobile */}
          {images.length > 1 && (
            <div
              className="absolute inset-0 touch-pan-x"
              onTouchStart={(e) => {
                const touch = e.touches[0];
                const startX = touch.clientX;
                
                const handleTouchMove = (moveEvent: TouchEvent) => {
                  const currentTouch = moveEvent.touches[0];
                  const deltaX = currentTouch.clientX - startX;
                  
                  if (Math.abs(deltaX) > 50) {
                    if (deltaX > 0) {
                      goToPrevious();
                    } else {
                      goToNext();
                    }
                    document.removeEventListener("touchmove", handleTouchMove);
                  }
                };
                
                document.addEventListener("touchmove", handleTouchMove);
                document.addEventListener("touchend", () => {
                  document.removeEventListener("touchmove", handleTouchMove);
                }, { once: true });
              }}
            />
          )}
        </div>
      )}
    </>
  );
}
