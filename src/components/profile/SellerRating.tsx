"use client";

import { useEffect, useState } from "react";
import { Star } from "lucide-react";

type SellerRatingProps = {
  profileId?: string;
  displayName: string;
};

export default function SellerRating({ profileId, displayName }: SellerRatingProps) {
  const [rating, setRating] = useState<number | null>(null);
  const [reviewCount, setReviewCount] = useState(0);

  useEffect(() => {
    if (!profileId) return;

    async function fetchRating() {
      try {
        // Fetch reviews for this seller
        const res = await fetch(`/api/business/reviews?profileId=${encodeURIComponent(profileId!)}`, { 
          cache: "no-store" 
        });
        
        if (!res.ok) {
          console.error("Failed to fetch reviews");
          return;
        }

        const data = await res.json();
        const reviews = data.reviews || [];
        
        if (reviews.length === 0) {
          setRating(null);
          setReviewCount(0);
          return;
        }

        // Calculate rating out of 100 based on:
        // - Average review rating (out of 5) = 70% weight
        // - Number of reviews (trustworthiness) = 30% weight
        const avgRating = reviews.reduce((sum: number, r: any) => sum + (r.rating || 0), 0) / reviews.length;
        const ratingScore = (avgRating / 5) * 70; // Convert 5-star to 70 points
        
        // Trust score: more reviews = higher trust (capped at 30)
        // 1 review = 10, 5 reviews = 20, 10+ reviews = 30
        const trustScore = Math.min(30, 10 + Math.log10(reviews.length + 1) * 10);
        
        const finalRating = Math.round(ratingScore + trustScore);
        
        setRating(finalRating);
        setReviewCount(reviews.length);
      } catch (error) {
        console.error("[SellerRating] Failed to fetch rating", error);
        setRating(null);
      }
    }

    fetchRating();
  }, [profileId]);

  if (rating === null || rating === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <div className="flex items-center gap-1">
        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
        <span className="font-semibold text-gray-900">{rating}/100</span>
      </div>
      <span className="text-gray-600">
        Seller Rating · {reviewCount} {reviewCount === 1 ? "review" : "reviews"}
      </span>
    </div>
  );
}
