"use client";

import { useState } from "react";
import SafeImage from "./SafeImage";

interface ListingImageGalleryProps {
  images: string[];
  title: string;
}

export default function ListingImageGallery({ images, title }: ListingImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  return (
    <div>
      {/* Main image */}
      <div className="aspect-[4/3] w-full overflow-hidden rounded-lg sm:rounded-xl border border-gray-200 bg-gray-50">
        <SafeImage
          src={images[selectedIndex]}
          alt={title}
          className="h-full w-full object-contain"
          loading="eager"
        />
      </div>

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
  );
}
