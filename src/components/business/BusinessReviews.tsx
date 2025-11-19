"use client";

import { useState, useEffect } from "react";
import { BusinessProfile } from "./BusinessStorefront";
import { Star, ThumbsUp, Flag, CheckCircle } from "lucide-react";

type Props = {
  businessId: string;
  business: BusinessProfile;
};

type Review = {
  id: string;
  rating: number;
  title: string | null;
  review_text: string | null;
  created_at: string;
  verified_purchase: boolean;
  business_response: string | null;
  business_responded_at: string | null;
  reviewer: {
    name: string;
    avatar: string | null;
  };
};

export default function BusinessReviews({ businessId, business }: Props) {
  const [filter, setFilter] = useState<'all' | 1 | 2 | 3 | 4 | 5>('all');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReviews() {
      try {
        const res = await fetch(`/api/business/reviews?business_id=${businessId}`);
        if (res.ok) {
          const data = await res.json();
          setReviews(data);
        }
      } catch (error) {
        console.error("Failed to fetch reviews:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchReviews();
  }, [businessId]);

  const ratingBreakdown: Array<{ stars: 1 | 2 | 3 | 4 | 5; count: number }> = [
    { stars: 5, count: business.five_star_count },
    { stars: 4, count: business.four_star_count },
    { stars: 3, count: business.three_star_count },
    { stars: 2, count: business.two_star_count },
    { stars: 1, count: business.one_star_count },
  ];

  const totalReviews = business.review_count;

  return (
    <div className="max-w-5xl">
      {/* Rating Overview */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Overall Rating */}
          <div className="text-center md:text-left">
            <div className="text-5xl font-bold text-gray-900 mb-2">
              {business.avg_rating > 0 ? business.avg_rating.toFixed(1) : "0.0"}
            </div>
            <div className="flex items-center justify-center md:justify-start gap-1 mb-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`w-5 h-5 ${
                    i < Math.floor(business.avg_rating)
                      ? "fill-yellow-500 text-yellow-500"
                      : "text-gray-300"
                  }`}
                />
              ))}
            </div>
            <p className="text-gray-600">{totalReviews} {totalReviews === 1 ? 'review' : 'reviews'}</p>
          </div>

          {/* Rating Breakdown */}
          <div className="space-y-2">
            {ratingBreakdown.map(({ stars, count }) => {
              const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
              return (
                <button
                  key={stars}
                  onClick={() => setFilter(filter === stars ? 'all' : stars)}
                  className={`w-full flex items-center gap-3 hover:bg-gray-50 p-2 rounded transition-colors ${
                    filter === stars ? 'bg-yellow-50' : ''
                  }`}
                >
                  <span className="text-sm text-gray-700 w-12">{stars} star</span>
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-yellow-500 transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-600 w-8 text-right">{count}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto"></div>
          </div>
        ) : totalReviews === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
            <Star className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No reviews yet</h3>
            <p className="text-gray-600">Be the first to review this business!</p>
          </div>
        ) : (
          reviews
            .filter((review) => filter === 'all' || review.rating === filter)
            .map((review) => (
              <div key={review.id} className="bg-white rounded-lg shadow-sm border p-6">
                {/* Review Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-semibold">
                      {review.reviewer.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">{review.reviewer.name}</span>
                        {review.verified_purchase && (
                          <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                            <CheckCircle className="w-3 h-3" />
                            Verified Purchase
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex items-center gap-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${
                                i < review.rating
                                  ? "fill-yellow-500 text-yellow-500"
                                  : "text-gray-300"
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-sm text-gray-500">
                          {new Date(review.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Review Content */}
                {review.title && (
                  <h4 className="font-semibold text-gray-900 mb-2">{review.title}</h4>
                )}
                {review.review_text && (
                  <p className="text-gray-700 whitespace-pre-wrap mb-4">{review.review_text}</p>
                )}

                {/* Business Response */}
                {review.business_response && (
                  <div className="mt-4 pl-4 border-l-4 border-yellow-400 bg-yellow-50 p-4 rounded">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold text-gray-900">Business Response</span>
                      <span className="text-xs text-gray-500">
                        {new Date(review.business_responded_at!).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-gray-700 text-sm">{review.business_response}</p>
                  </div>
                )}
              </div>
            ))
        )}
      </div>
    </div>
  );
}
