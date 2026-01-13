// src/app/reviews/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Star, AlertCircle, Check } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";

type ReviewPrompt = {
  sellerId: string;
  sellerName: string;
  items: Array<{
    orderId: string;
    title: string;
    image?: string;
  }>;
};

type Review = {
  id: string;
  title?: string;
  review_text?: string;
  rating: number;
  created_at: string;
  business_profile_id?: string;
  reviewer_profile_id?: string;
};

export default function ReviewsPage() {
  const [eligibleOrders, setEligibleOrders] = useState<ReviewPrompt[]>([]);
  const [receivedReviews, setReceivedReviews] = useState<Review[]>([]);
  const [leftReviews, setLeftReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewingOrder, setReviewingOrder] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const loadUser = async () => {
      const u = await getCurrentUser();
      setUser(u);
    };
    loadUser();
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [eligRes, recvRes, leftRes] = await Promise.all([
          fetch("/api/reviews/eligible-orders"),
          fetch("/api/reviews?type=received"),
          fetch("/api/reviews?type=left"),
        ]);

        if (!eligRes.ok || !recvRes.ok || !leftRes.ok) {
          throw new Error("Failed to load reviews");
        }

        const eligData = await eligRes.json();
        const recvData = await recvRes.json();
        const leftData = await leftRes.json();

        setEligibleOrders(eligData.eligibleOrders || []);
        setReceivedReviews(recvData.reviews || []);
        setLeftReviews(leftData.reviews || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <section className="max-w-6xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-4">
        <h1 className="text-3xl font-bold">My Reviews</h1>
        <div className="h-40 bg-gray-100 rounded-lg animate-pulse" />
      </section>
    );
  }

  return (
    <section className="max-w-6xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-8">
      <h1 className="text-3xl font-bold">My Reviews</h1>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex gap-2">
          <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Review Prompts Section */}
      {eligibleOrders.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 space-y-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <h2 className="font-bold text-blue-900 mb-2">Leave a Review</h2>
              <p className="text-sm text-blue-800 mb-4">
                Your orders have been delivered. Share your experience with these sellers!
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {eligibleOrders.map((seller) => (
              <div
                key={seller.sellerId}
                className="bg-white border border-blue-100 rounded-lg p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-2">
                      {seller.sellerName}
                    </h3>
                    <div className="space-y-1 mb-3">
                      {seller.items.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                          <div className="h-8 w-8 rounded bg-gray-100 overflow-hidden flex-shrink-0">
                            {item.image && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={item.image}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            )}
                          </div>
                          <span className="line-clamp-1">{item.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => setReviewingOrder(seller.items[0].orderId)}
                    className="px-4 py-2 bg-yellow-500 text-black font-semibold rounded-lg hover:bg-yellow-600 transition flex-shrink-0 text-sm"
                  >
                    Review
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reviews You Left */}
      <div>
        <h2 className="text-xl font-bold mb-4">Reviews You&apos;ve Left</h2>
        {leftReviews.length === 0 ? (
          <p className="text-gray-600 text-sm">
            You haven&apos;t left any reviews yet. After you receive an order, you can leave a review.
          </p>
        ) : (
          <div className="space-y-4">
            {leftReviews.map((review) => (
              <div
                key={review.id}
                className="bg-white border border-gray-200 rounded-lg p-4 space-y-2"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          size={16}
                          className={
                            i < review.rating
                              ? "fill-yellow-500 text-yellow-500"
                              : "text-gray-300"
                          }
                        />
                      ))}
                    </div>
                    <span className="text-sm text-gray-600">
                      {new Date(review.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                {review.title && (
                  <h3 className="font-semibold text-gray-900">{review.title}</h3>
                )}
                {review.review_text && (
                  <p className="text-gray-700 text-sm">{review.review_text}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reviews You've Received */}
      <div>
        <h2 className="text-xl font-bold mb-4">Reviews You&apos;ve Received</h2>
        {receivedReviews.length === 0 ? (
          <p className="text-gray-600 text-sm">
            You haven&apos;t received any reviews yet.
          </p>
        ) : (
          <div className="space-y-4">
            {receivedReviews.map((review) => (
              <div
                key={review.id}
                className="bg-white border border-gray-200 rounded-lg p-4 space-y-2"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          size={16}
                          className={
                            i < review.rating
                              ? "fill-yellow-500 text-yellow-500"
                              : "text-gray-300"
                          }
                        />
                      ))}
                    </div>
                    <span className="text-sm text-gray-600">
                      {new Date(review.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-full">
                    <Check size={12} />
                    Verified Purchase
                  </span>
                </div>
                {review.title && (
                  <h3 className="font-semibold text-gray-900">{review.title}</h3>
                )}
                {review.review_text && (
                  <p className="text-gray-700 text-sm">{review.review_text}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Review Modal - TODO: implement ReviewModal component */}
      {reviewingOrder && (
        <ReviewModal
          orderId={reviewingOrder}
          onClose={() => setReviewingOrder(null)}
          onSubmit={() => {
            setReviewingOrder(null);
            window.location.reload();
          }}
        />
      )}
    </section>
  );
}

function ReviewModal({
  orderId,
  onClose,
  onSubmit,
}: {
  orderId: string;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating,
          title,
          reviewText: text,
          orderId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit review");
      }

      onSubmit();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full space-y-4">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold">Leave a Review</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Rating
            </label>
            <div className="flex gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setRating(i + 1)}
                  className="focus:outline-none transition"
                >
                  <Star
                    size={28}
                    className={
                      i < rating
                        ? "fill-yellow-500 text-yellow-500"
                        : "text-gray-300 hover:text-gray-400"
                    }
                  />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Sum up your experience"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Your Review
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Share your experience..."
              rows={4}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-900 font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-yellow-500 text-black font-semibold rounded-lg hover:bg-yellow-600 disabled:opacity-50"
            >
              {submitting ? "Submitting…" : "Submit Review"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
