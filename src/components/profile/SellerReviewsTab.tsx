"use client";

import { useEffect, useState } from "react";
import { Star } from "lucide-react";

type Review = {
  id: string;
  rating: number;
  title?: string;
  review_text?: string;
  created_at: string;
  reviewer_name?: string;
  reviewer_profile_id?: string;
};

interface SellerReviewsTabProps {
  sellerId?: string;
  sellerName: string;
}

export default function SellerReviewsTab({ sellerId, sellerName }: SellerReviewsTabProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [avgRating, setAvgRating] = useState(0);

  useEffect(() => {
    async function fetchReviews() {
      try {
        setLoading(true);
        setError(null);

        if (!sellerId) {
          setReviews([]);
          setAvgRating(0);
          return;
        }

        const res = await fetch(
          `/api/business/reviews?profileId=${encodeURIComponent(sellerId)}`,
          { cache: "no-store" }
        );

        if (!res.ok) {
          setReviews([]);
          setAvgRating(0);
          return;
        }

        const data = await res.json();
        const fetchedReviews = (data.reviews || []).sort(
          (a: Review, b: Review) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        setReviews(fetchedReviews);

        if (fetchedReviews.length > 0) {
          const total = fetchedReviews.reduce((sum: number, r: Review) => sum + (r.rating || 0), 0);
          setAvgRating(Math.round((total / fetchedReviews.length) * 10) / 10);
        } else {
          setAvgRating(0);
        }
      } catch (err) {
        console.error("[SellerReviewsTab] Failed to fetch reviews", err);
        setError("Failed to load reviews");
      } finally {
        setLoading(false);
      }
    }

    fetchReviews();
  }, [sellerId]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-32 bg-gray-100 rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 p-10 text-center">
        <div className="mx-auto h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
          <Star className="h-6 w-6 text-gray-400" />
        </div>
        <div className="text-gray-800 font-medium">No reviews yet</div>
        <div className="text-gray-600 text-sm mt-1">
          {sellerName} hasn't received any reviews from buyers.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
        <div className="flex items-center gap-4">
          <div>
            <div className="text-3xl font-bold text-gray-900">{avgRating.toFixed(1)}</div>
            <div className="text-sm text-gray-500">out of 5.0</div>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  size={20}
                  className={
                    i < Math.round(avgRating)
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-gray-300"
                  }
                />
              ))}
            </div>
            <div className="text-sm text-gray-600">
              Based on {reviews.length} {reviews.length === 1 ? "review" : "reviews"}
            </div>
          </div>
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-3">
        {reviews.map((review) => (
          <div
            key={review.id}
            className="bg-white rounded-lg border border-gray-200 p-4 hover:border-gray-300 transition"
          >
            {/* Header with rating and date */}
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    size={16}
                    className={
                      i < review.rating
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-300"
                    }
                  />
                ))}
              </div>
              <div className="text-xs text-gray-500">
                {new Date(review.created_at).toLocaleDateString("en-GB", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </div>
            </div>

            {/* Review Title */}
            {review.title && (
              <h4 className="font-semibold text-gray-900 mb-1 text-sm">
                {review.title}
              </h4>
            )}

            {/* Review Text */}
            {review.review_text && (
              <p className="text-gray-700 text-sm mb-2 line-clamp-4">
                {review.review_text}
              </p>
            )}

            {/* Reviewer Name */}
            {review.reviewer_name && (
              <div className="text-xs text-gray-500 pt-2 border-t border-gray-100">
                By {review.reviewer_name}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
