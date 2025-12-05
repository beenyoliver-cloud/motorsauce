// src/components/ReviewMessage.tsx
"use client";

import Link from "next/link";
import { Star, Package } from "lucide-react";

type Props = {
  review: {
    id: string;
    rating: number;
    title?: string;
    text?: string;
    listingId?: string;
    listingTitle?: string;
    listingImage?: string;
  };
  isMe: boolean;
};

export function ReviewMessage({ review, isMe }: Props) {
  const img = (review.listingImage || "").trim();

  return (
    <div className={`my-3 rounded-xl border-2 border-purple-200 bg-purple-50 shadow-md overflow-hidden`}>
      {/* Rating Banner */}
      <div className="px-4 py-2 flex items-center justify-between bg-purple-100 border-b-2 border-purple-200">
        <div className="flex items-center gap-2">
          <div className="flex gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                size={14}
                className={
                  i < review.rating
                    ? "fill-yellow-500 text-yellow-500"
                    : "text-gray-300"
                }
              />
            ))}
          </div>
          <span className="text-sm font-semibold text-purple-900">{review.rating} out of 5</span>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* Listing Preview (if available) */}
        {review.listingId && (
          <Link
            href={`/listing/${review.listingId}`}
            className="block hover:opacity-80 transition"
          >
            <div className="flex gap-3">
              {img ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={img}
                  alt=""
                  className="h-16 w-20 rounded-lg bg-gray-100 border border-gray-200 object-cover flex-shrink-0"
                />
              ) : (
                <div className="h-16 w-20 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0">
                  <Package size={20} className="text-gray-400" />
                </div>
              )}
              {review.listingTitle && (
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-600 font-medium uppercase">About this listing</p>
                  <p className="text-sm font-semibold text-gray-900 line-clamp-2">
                    {review.listingTitle}
                  </p>
                </div>
              )}
            </div>
          </Link>
        )}

        {/* Review Title */}
        {review.title && (
          <div>
            <p className="font-semibold text-gray-900">{review.title}</p>
          </div>
        )}

        {/* Review Text */}
        {review.text && (
          <div>
            <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">
              {review.text}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
