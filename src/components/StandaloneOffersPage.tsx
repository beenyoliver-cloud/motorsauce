"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Clock,
  CheckCircle,
  XCircle,
  ArrowRightLeft,
  Trash2,
  MessageCircle,
  ChevronRight,
} from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase";
import SafeImage from "./SafeImage";

interface Offer {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  listing_title: string;
  listing_image: string | null;
  listing_price: number;
  offered_amount: number;
  currency: string;
  status: "pending" | "accepted" | "declined" | "countered" | "withdrawn";
  counter_amount: number | null;
  counter_notes: string | null;
  created_at: string;
  responded_at: string | null;
  expires_at: string;
}

export default function StandaloneOffersPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"sent" | "received">("sent");
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [respondingOfferId, setRespondingOfferId] = useState<string | null>(null);
  const [counterAmounts, setCounterAmounts] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    fetchOffers();
  }, [activeTab]);

  async function fetchOffers() {
    setLoading(true);
    setError(null);
    try {
      const supabase = supabaseBrowser();
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        setError("Please log in to view offers");
        router.push("/auth/login");
        return;
      }

      const type = activeTab === "sent" ? "sent" : "received";
      const response = await fetch(`/api/offers-standalone?type=${type}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `API error: ${response.status}`);
      }

      const data = await response.json();
      setOffers(data.offers || []);
    } catch (err) {
      console.error("Failed to fetch offers:", err);
      setError(err instanceof Error ? err.message : "Failed to load offers");
    } finally {
      setLoading(false);
    }
  }

  async function respondToOffer(offerId: string, status: string, counterAmount?: number) {
    setRespondingOfferId(offerId);
    try {
      const supabase = supabaseBrowser();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) return;

      const response = await fetch(`/api/offers-standalone`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          offerId,
          status,
          counterAmount: counterAmount || null,
        }),
      });

      if (response.ok) {
        // Refresh offers
        fetchOffers();
        setCounterAmounts({});
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error("Error responding to offer:", error);
      alert("Failed to respond to offer");
    } finally {
      setRespondingOfferId(null);
    }
  }

  function getStatusBadge(status: string) {
    const statusConfig: Record<string, { bg: string; text: string; icon: any }> = {
      pending: { bg: "bg-yellow-100", text: "text-yellow-800", icon: Clock },
      accepted: { bg: "bg-green-100", text: "text-green-800", icon: CheckCircle },
      declined: { bg: "bg-red-100", text: "text-red-800", icon: XCircle },
      countered: { bg: "bg-blue-100", text: "text-blue-800", icon: ArrowRightLeft },
      withdrawn: { bg: "bg-gray-100", text: "text-gray-800", icon: Trash2 },
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium ${config.bg} ${config.text}`}>
        <Icon className="h-4 w-4" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  }

  function formatPrice(amount: number, currency: string = "GBP") {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
    }).format(amount);
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function getDaysLeft(expiresAt: string) {
    const now = new Date();
    const expires = new Date(expiresAt);
    const daysLeft = Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysLeft > 0 ? daysLeft : 0;
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-gray-500">Loading offers...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <div className="rounded-lg border border-red-200 bg-red-50 p-6">
            <h2 className="text-lg font-semibold text-red-900">Error Loading Offers</h2>
            <p className="mt-2 text-red-800">{error}</p>
            <p className="mt-4 text-sm text-red-700">
              The offers system is still being set up. Please ensure the database tables and functions have been created in Supabase.
            </p>
            <button
              onClick={() => fetchOffers()}
              className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">Offers</h1>
          <p className="mt-2 text-gray-600">Manage your sent and received offers</p>
        </div>

        {/* Tabs */}
        <div className="mb-8 flex gap-4 border-b border-gray-200">
          <button
            onClick={() => setActiveTab("sent")}
            className={`px-4 py-3 font-medium transition-colors ${
              activeTab === "sent"
                ? "border-b-2 border-yellow-500 text-yellow-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Offers Sent ({offers.length})
          </button>
          <button
            onClick={() => setActiveTab("received")}
            className={`px-4 py-3 font-medium transition-colors ${
              activeTab === "received"
                ? "border-b-2 border-yellow-500 text-yellow-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Offers Received ({offers.length})
          </button>
        </div>

        {/* Empty State */}
        {offers.length === 0 && (
          <div className="text-center py-16">
            <MessageCircle className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">No offers yet</h3>
            <p className="mt-2 text-gray-600 mb-6">
              {activeTab === "sent"
                ? "Browse listings and make your first offer!"
                : "You haven't received any offers yet."}
            </p>
            {activeTab === "sent" && (
              <Link
                href="/search"
                className="inline-block rounded-lg bg-yellow-500 px-6 py-2 font-semibold text-black hover:bg-yellow-600"
              >
                Browse Listings
              </Link>
            )}
          </div>
        )}

        {/* Offers Grid */}
        {offers.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {offers.map((offer) => (
              <div
                key={offer.id}
                className="rounded-lg border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col"
              >
                {/* Image */}
                <Link href={`/listing/${offer.listing_id}`} className="block relative h-48 bg-gray-100 overflow-hidden hover:opacity-90 transition-opacity">
                  {offer.listing_image ? (
                    <img
                      src={offer.listing_image}
                      alt={offer.listing_title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <span className="text-gray-400">No image</span>
                    </div>
                  )}
                </Link>

                {/* Content */}
                <div className="flex flex-col flex-1 p-4">
                  {/* Title and Status */}
                  <div className="mb-3">
                    <Link
                      href={`/listing/${offer.listing_id}`}
                      className="text-lg font-semibold text-gray-900 hover:text-yellow-600 line-clamp-2"
                    >
                      {offer.listing_title}
                    </Link>
                    <div className="mt-2">{getStatusBadge(offer.status)}</div>
                  </div>

                  {/* Price Comparison */}
                  <div className="mb-4 p-3 bg-gray-100 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600">Listed Price</span>
                      <span className="text-sm text-gray-400 line-through">
                        {formatPrice(offer.listing_price, offer.currency)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">Your Offer</span>
                      <span className="text-lg font-bold text-yellow-600">
                        {formatPrice(offer.offered_amount, offer.currency)}
                      </span>
                    </div>
                    {offer.counter_amount && (
                      <div className="mt-2 pt-2 border-t border-gray-300 flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700">Counter</span>
                        <span className="text-lg font-bold text-blue-600">
                          {formatPrice(offer.counter_amount, offer.currency)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Timestamps */}
                  <div className="mb-4 space-y-1 text-xs text-gray-500">
                    <div>Created: {formatDate(offer.created_at)}</div>
                    {offer.responded_at && <div>Responded: {formatDate(offer.responded_at)}</div>}
                    {offer.status === "pending" && (
                      <div className="text-yellow-600 font-medium">
                        Expires in {getDaysLeft(offer.expires_at)} days
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  {offer.status === "pending" && activeTab === "received" && (
                    <div className="mt-auto space-y-2 pt-4 border-t border-gray-200">
                      <button
                        onClick={() => respondToOffer(offer.id, "accepted")}
                        disabled={respondingOfferId === offer.id}
                        className="w-full rounded-lg bg-green-500 px-4 py-2 text-sm font-semibold text-white hover:bg-green-600 disabled:opacity-50 transition-colors"
                      >
                        {respondingOfferId === offer.id ? "Accepting..." : "Accept"}
                      </button>
                      <button
                        onClick={() => respondToOffer(offer.id, "declined")}
                        disabled={respondingOfferId === offer.id}
                        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                      >
                        {respondingOfferId === offer.id ? "Declining..." : "Decline"}
                      </button>
                      <button
                        onClick={() => respondToOffer(offer.id, "countered", parseFloat(counterAmounts[offer.id] || "0"))}
                        disabled={respondingOfferId === offer.id}
                        className="w-full rounded-lg border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50 transition-colors"
                      >
                        Counter
                      </button>
                      {respondingOfferId === offer.id && (
                        <input
                          type="number"
                          placeholder="Counter amount"
                          value={counterAmounts[offer.id] || ""}
                          onChange={(e) =>
                            setCounterAmounts({
                              ...counterAmounts,
                              [offer.id]: e.target.value,
                            })
                          }
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        />
                      )}
                    </div>
                  )}

                  {offer.status === "pending" && activeTab === "sent" && (
                    <div className="mt-auto pt-4 border-t border-gray-200">
                      <button
                        onClick={() => respondToOffer(offer.id, "withdrawn")}
                        disabled={respondingOfferId === offer.id}
                        className="w-full rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
                      >
                        {respondingOfferId === offer.id ? "Withdrawing..." : "Withdraw Offer"}
                      </button>
                    </div>
                  )}

                  {offer.status === "accepted" && (
                    <Link
                      href={`/checkout?offer=${offer.id}`}
                      className="mt-auto pt-4 border-t border-gray-200 block w-full text-center rounded-lg bg-yellow-500 px-4 py-2 text-sm font-semibold text-black hover:bg-yellow-600 transition-colors"
                    >
                      Proceed to Checkout
                    </Link>
                  )}

                  {/* View Listing Link */}
                  <Link
                    href={`/listing/${offer.listing_id}`}
                    className="mt-2 flex items-center justify-center gap-2 text-sm text-yellow-600 hover:text-yellow-700 font-medium"
                  >
                    View Listing <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
