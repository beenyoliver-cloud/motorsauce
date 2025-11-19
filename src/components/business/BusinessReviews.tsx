"use client";

import { useState } from "react";
import { BusinessProfile } from "./BusinessStorefront";
import { Star, ThumbsUp, Flag } from "lucide-react";

type Props = {
  businessId: string;
  business: BusinessProfile;
};

export default function BusinessReviews({ businessId, business }: Props) {
  const [filter, setFilter] = useState<'all' | 1 | 2 | 3 | 4 | 5>('all');

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
        {totalReviews === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
            <Star className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No reviews yet</h3>
            <p className="text-gray-600">Be the first to review this business!</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <p className="text-gray-600 text-center">
              Reviews functionality will load dynamically from the database.
              {filter !== 'all' && ` Showing ${filter}-star reviews only.`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
