"use client";

import { useState } from "react";
import { X, ChevronLeft, ChevronRight, Download, Share2, Maximize2 } from "lucide-react";
import { autoBlurPlates, shouldAutoBlur } from "@/lib/plateBlur";
import type { Car } from "@/lib/garage";

interface DisplayWallProps {
  cars: Car[];
  onPhotoClick?: (carId: string, photoIndex: number) => void;
  autoBlur?: boolean;
}

/**
 * Instagram-style photo grid displaying all car photos from the garage
 */
export default function DisplayWall({ cars, onPhotoClick, autoBlur = true }: DisplayWallProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [blurredImages, setBlurredImages] = useState<Map<string, string>>(new Map());

  // Collect all photos from all cars
  const allPhotos: Array<{ carId: string; photoUrl: string; carLabel: string; index: number }> = [];
  
  cars.forEach((car) => {
    const label = `${car.year} ${car.make} ${car.model}`.trim();
    
    // Add main image
    if (car.image) {
      allPhotos.push({
        carId: car.id,
        photoUrl: car.image,
        carLabel: label,
        index: 0,
      });
    }
    
    // Add additional photos
    if (car.photos && car.photos.length > 0) {
      car.photos.forEach((photo, idx) => {
        allPhotos.push({
          carId: car.id,
          photoUrl: photo,
          carLabel: label,
          index: idx + 1,
        });
      });
    }
  });

  const getImageUrl = (photoUrl: string, carId: string): string => {
    if (!autoBlur) return photoUrl;
    
    // Check if we have a blurred version cached
    const blurredUrl = blurredImages.get(`${carId}-${photoUrl}`);
    if (blurredUrl) return blurredUrl;
    
    // Check if this car needs blurring
    const car = cars.find(c => c.id === carId);
    if (car && shouldAutoBlur(car)) {
      // Blur asynchronously and cache
      autoBlurPlates(photoUrl)
        .then(blurred => {
          setBlurredImages(prev => new Map(prev).set(`${carId}-${photoUrl}`, blurred));
        })
        .catch(() => {
          // If blur fails, just use original
        });
    }
    
    return photoUrl;
  };

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
    if (onPhotoClick) {
      const photo = allPhotos[index];
      onPhotoClick(photo.carId, photo.index);
    }
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
  };

  const goToPrevious = () => {
    setLightboxIndex((prev) => (prev - 1 + allPhotos.length) % allPhotos.length);
  };

  const goToNext = () => {
    setLightboxIndex((prev) => (prev + 1) % allPhotos.length);
  };

  const downloadPhoto = () => {
    const photo = allPhotos[lightboxIndex];
    const a = document.createElement("a");
    a.href = getImageUrl(photo.photoUrl, photo.carId);
    a.download = `${photo.carLabel.replace(/\s+/g, "-")}-${photo.index + 1}.jpg`;
    a.click();
  };

  const sharePhoto = async () => {
    const photo = allPhotos[lightboxIndex];
    if (navigator.share) {
      try {
        await navigator.share({
          title: photo.carLabel,
          text: `Check out my ${photo.carLabel}`,
          url: window.location.href,
        });
      } catch (err) {
        // User cancelled or error occurred
      }
    }
  };

  if (allPhotos.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
        <p className="text-gray-600">No photos in the display wall yet.</p>
        <p className="text-sm text-gray-500 mt-2">Add photos to your vehicles to create your showcase!</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <h3 className="text-lg font-bold text-black flex items-center gap-2">
            <Maximize2 className="h-5 w-5" />
            Display Wall
            <span className="text-sm font-normal text-gray-600 ml-2">
              ({allPhotos.length} photo{allPhotos.length === 1 ? "" : "s"})
            </span>
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Your car collection showcase
          </p>
        </div>

        {/* Photo Grid - Instagram style */}
        <div className="p-2 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
          {allPhotos.map((photo, index) => (
            <button
              key={`${photo.carId}-${photo.index}`}
              onClick={() => openLightbox(index)}
              className="aspect-square rounded-lg overflow-hidden bg-gray-100 hover:opacity-90 transition-opacity relative group"
            >
              <img
                src={getImageUrl(photo.photoUrl, photo.carId)}
                alt={`${photo.carLabel} - Photo ${photo.index + 1}`}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all flex items-center justify-center">
                <Maximize2 className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Lightbox */}
      {lightboxOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-95 z-50 flex items-center justify-center">
          {/* Close button */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 p-2 rounded-full bg-white bg-opacity-10 hover:bg-opacity-20 transition-all text-white z-10"
            aria-label="Close"
          >
            <X className="h-6 w-6" />
          </button>

          {/* Navigation */}
          <button
            onClick={goToPrevious}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white bg-opacity-10 hover:bg-opacity-20 transition-all text-white z-10"
            aria-label="Previous"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>

          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white bg-opacity-10 hover:bg-opacity-20 transition-all text-white z-10"
            aria-label="Next"
          >
            <ChevronRight className="h-6 w-6" />
          </button>

          {/* Image */}
          <div className="max-w-7xl max-h-[90vh] w-full h-full flex items-center justify-center px-4 py-16">
            <img
              src={getImageUrl(allPhotos[lightboxIndex].photoUrl, allPhotos[lightboxIndex].carId)}
              alt={`${allPhotos[lightboxIndex].carLabel} - Photo ${allPhotos[lightboxIndex].index + 1}`}
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            />
          </div>

          {/* Info bar */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-6">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <div className="text-white">
                <p className="font-semibold text-lg">{allPhotos[lightboxIndex].carLabel}</p>
                <p className="text-sm text-gray-300">
                  Photo {lightboxIndex + 1} of {allPhotos.length}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={downloadPhoto}
                  className="p-2 rounded-lg bg-white bg-opacity-10 hover:bg-opacity-20 transition-all text-white"
                  aria-label="Download"
                >
                  <Download className="h-5 w-5" />
                </button>
                  {typeof navigator !== 'undefined' && 'share' in navigator && (
                  <button
                    onClick={sharePhoto}
                    className="p-2 rounded-lg bg-white bg-opacity-10 hover:bg-opacity-20 transition-all text-white"
                    aria-label="Share"
                  >
                    <Share2 className="h-5 w-5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Keyboard hint */}
          <div className="absolute top-4 left-4 text-white text-sm bg-black bg-opacity-50 px-3 py-2 rounded-lg">
            Use ← → arrow keys to navigate • ESC to close
          </div>
        </div>
      )}

      {/* Keyboard navigation */}
      {lightboxOpen && (
        <div
          className="hidden"
          onKeyDown={(e) => {
            if (e.key === "Escape") closeLightbox();
            if (e.key === "ArrowLeft") goToPrevious();
            if (e.key === "ArrowRight") goToNext();
          }}
          tabIndex={-1}
        />
      )}
    </>
  );
}
