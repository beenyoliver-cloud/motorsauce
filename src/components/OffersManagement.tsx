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
} from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase";
import SafeImage from "./SafeImage";

type OfferStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "countered"
  | "expired"
  | "withdrawn";

interface Offer {
  id: string;
  listing_id: string;
  starter: string; // buyer_id
  recipient: string; // seller_id
  amount: number; // decimal from database
  message: string | null;
  status: OfferStatus;
  counter_amount: number | null; // decimal from database
  counter_message: string | null;
  expires_at: string;
  created_at: string;
  responded_at: string | null;
  listing: {
    id: string;
    title: string;
    price: number; // decimal price
    images: string[];
    status: string;
  };
  buyer: {
    id: string;
    name: string; // changed from username
    avatar_url: string | null;
  };
  seller: {
    id: string;
    name: string; // changed from username
    avatar_url: string | null;
  };
}

interface OffersManagementProps {
  userId: string;
}

export default function OffersManagement({ userId }: OffersManagementProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"sent" | "received">("sent");
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioningOfferId, setActioningOfferId] = useState<string | null>(null);
  const [counterAmount, setCounterAmount] = useState<{ [key: string]: string }>(
    {}
  );
  const [counterMessage, setCounterMessage] = useState<{
    [key: string]: string;
  }>({});
  const [showCounterForm, setShowCounterForm] = useState<{
    [key: string]: boolean;
  }>({});

  useEffect(() => {
    fetchOffers();
  }, [activeTab]);

  async function fetchOffers() {
    setLoading(true);
    try {
      const supabase = supabaseBrowser();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/auth/login");
        return;
      }

      const role = activeTab === "sent" ? "buyer" : "seller";
      const response = await fetch(`/api/offers/manage?role=${role}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setOffers(data.offers || []);
      }
    } catch (error) {
      console.error("Failed to fetch offers:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(
    offerId: string,
    action: "withdraw" | "accept" | "reject" | "counter" | "accept_counter"
  ) {
    setActioningOfferId(offerId);
    try {
      const supabase = supabaseBrowser();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) return;

      const body: any = { offer_id: offerId, action };

      if (action === "counter") {
        const amount = parseFloat(
          (counterAmount[offerId] || "0").replace(/[^\d.]/g, "")
        );
        if (!amount || amount <= 0) {
          alert("Please enter a valid counter offer amount");
          setActioningOfferId(null);
          return;
        }
        body.counter_amount_cents = Math.round(amount * 100);
        body.counter_message = counterMessage[offerId] || "";
      }

      const response = await fetch("/api/offers/manage", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        await fetchOffers();
        setShowCounterForm({ ...showCounterForm, [offerId]: false });
        setCounterAmount({ ...counterAmount, [offerId]: "" });
        setCounterMessage({ ...counterMessage, [offerId]: "" });
      } else {
        const error = await response.json();
        alert(error.error || "Action failed");
      }
    } catch (error) {
      console.error("Action failed:", error);
      alert("Action failed. Please try again.");
    } finally {
      setActioningOfferId(null);
    }
  }

  function formatPrice(amount: number): string {
    // amount is already decimal from database
    return `£${amount.toFixed(2)}`;
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function isExpired(expiresAt: string): boolean {
    return new Date(expiresAt) < new Date();
  }

  function getStatusBadge(status: OfferStatus, expiresAt: string) {
    if (status === "pending" && isExpired(expiresAt)) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
          <Clock className="h-3 w-3" />
          Expired
        </span>
      );
    }

    const badges = {
      pending: (
        <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800">
          <Clock className="h-3 w-3" />
          Pending
        </span>
      ),
      accepted: (
        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
          <CheckCircle className="h-3 w-3" />
          Accepted
        </span>
      ),
      rejected: (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-800">
          <XCircle className="h-3 w-3" />
          Rejected
        </span>
      ),
      countered: (
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
          <ArrowRightLeft className="h-3 w-3" />
          Counter Offer
        </span>
      ),
      expired: (
        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
          <Clock className="h-3 w-3" />
          Expired
        </span>
      ),
      withdrawn: (
        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
          <Trash2 className="h-3 w-3" />
          Withdrawn
        </span>
      ),
    };

    return badges[status];
  }

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold text-gray-900">My Offers</h1>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("sent")}
            className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium transition-colors ${
              activeTab === "sent"
                ? "border-yellow-500 text-yellow-600"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
            }`}
          >
            Offers Sent
          </button>
          <button
            onClick={() => setActiveTab("received")}
            className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium transition-colors ${
              activeTab === "received"
                ? "border-yellow-500 text-yellow-600"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
            }`}
          >
            Offers Received
          </button>
        </nav>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-yellow-500 border-t-transparent"></div>
        </div>
      )}

      {/* Empty State */}
      {!loading && offers.length === 0 && (
        <div className="rounded-lg border-2 border-dashed border-gray-300 bg-white p-12 text-center">
          <MessageCircle className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            No offers yet
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            {activeTab === "sent"
              ? "You haven't made any offers yet. Browse listings and make an offer!"
              : "You haven't received any offers on your listings yet."}
          </p>
          {activeTab === "sent" && (
            <Link
              href="/search"
              className="mt-4 inline-block rounded-lg bg-yellow-500 px-4 py-2 text-sm font-semibold text-black hover:bg-yellow-600"
            >
              Browse Listings
            </Link>
          )}
        </div>
      )}

      {/* Offers List */}
      {!loading && offers.length > 0 && (
        <div className="space-y-4">
          {offers.map((offer) => {
            const isExpiredOffer =
              offer.status === "pending" && isExpired(offer.expires_at);
            const canWithdraw =
              activeTab === "sent" &&
              offer.status === "pending" &&
              !isExpiredOffer;
            const canRespond =
              activeTab === "received" &&
              offer.status === "pending" &&
              !isExpiredOffer;
            const canAcceptCounter =
              activeTab === "sent" && offer.status === "countered";

            return (
              <div
                key={offer.id}
                className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="p-6">
                  <div className="flex gap-4">
                    {/* Listing Image */}
                    <Link
                      href={`/listing/${offer.listing.id}`}
                      className="flex-shrink-0"
                    >
                      <SafeImage
                        src={offer.listing.images[0]}
                        alt={offer.listing.title}
                        className="h-24 w-24 rounded-lg object-cover"
                      />
                    </Link>

                    {/* Offer Details */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <Link
                            href={`/listing/${offer.listing.id}`}
                            className="text-lg font-semibold text-gray-900 hover:text-yellow-600"
                          >
                            {offer.listing.title}
                          </Link>
                          <p className="mt-1 text-sm text-gray-500">
                            Asking Price: {formatPrice(offer.listing.price)}
                          </p>
                        </div>
                        {getStatusBadge(offer.status, offer.expires_at)}
                      </div>

                      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <p className="text-sm font-medium text-gray-500">
                            {activeTab === "sent" ? "Your Offer" : "Buyer's Offer"}
                          </p>
                          <p className="mt-1 text-xl font-bold text-gray-900">
                            {formatPrice(offer.amount)}
                          </p>
                          {offer.message && (
                            <p className="mt-1 text-sm text-gray-600">
                              &quot;{offer.message}&quot;
                            </p>
                          )}
                        </div>

                        {offer.status === "countered" &&
                          offer.counter_amount && (
                            <div>
                              <p className="text-sm font-medium text-gray-500">
                                Counter Offer
                              </p>
                              <p className="mt-1 text-xl font-bold text-blue-600">
                                {formatPrice(offer.counter_amount)}
                              </p>
                              {offer.counter_message && (
                                <p className="mt-1 text-sm text-gray-600">
                                  &quot;{offer.counter_message}&quot;
                                </p>
                              )}
                            </div>
                          )}
                      </div>

                      <div className="mt-4 flex items-center gap-4 text-xs text-gray-500">
                        <span>
                          {activeTab === "sent" ? "Sent" : "Received"}:{" "}
                          {formatDate(offer.created_at)}
                        </span>
                        {offer.status === "pending" && !isExpiredOffer && (
                          <span>
                            Expires: {formatDate(offer.expires_at)}
                          </span>
                        )}
                        {offer.responded_at && (
                          <span>Responded: {formatDate(offer.responded_at)}</span>
                        )}
                      </div>

                      {/* Action Buttons */}
                      {!isExpiredOffer && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {canWithdraw && (
                            <button
                              onClick={() => handleAction(offer.id, "withdraw")}
                              disabled={actioningOfferId === offer.id}
                              className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                            >
                              {actioningOfferId === offer.id
                                ? "Withdrawing..."
                                : "Withdraw Offer"}
                            </button>
                          )}

                          {canRespond && (
                            <>
                              <button
                                onClick={() => handleAction(offer.id, "accept")}
                                disabled={actioningOfferId === offer.id}
                                className="rounded-lg bg-green-500 px-4 py-2 text-sm font-medium text-white hover:bg-green-600 disabled:opacity-50"
                              >
                                {actioningOfferId === offer.id
                                  ? "Accepting..."
                                  : "Accept"}
                              </button>
                              <button
                                onClick={() => handleAction(offer.id, "reject")}
                                disabled={actioningOfferId === offer.id}
                                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                              >
                                {actioningOfferId === offer.id
                                  ? "Rejecting..."
                                  : "Reject"}
                              </button>
                              <button
                                onClick={() =>
                                  setShowCounterForm({
                                    ...showCounterForm,
                                    [offer.id]: !showCounterForm[offer.id],
                                  })
                                }
                                className="rounded-lg border border-blue-300 bg-white px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50"
                              >
                                Counter Offer
                              </button>
                            </>
                          )}

                          {canAcceptCounter && offer.counter_amount && (
                            <button
                              onClick={() =>
                                handleAction(offer.id, "accept_counter")
                              }
                              disabled={actioningOfferId === offer.id}
                              className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50"
                            >
                              {actioningOfferId === offer.id
                                ? "Accepting..."
                                : `Accept Counter (${formatPrice(offer.counter_amount)})`}
                            </button>
                          )}
                        </div>
                      )}

                      {/* Counter Offer Form */}
                      {showCounterForm[offer.id] && (
                        <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
                          <h4 className="mb-2 text-sm font-medium text-gray-900">
                            Make Counter Offer
                          </h4>
                          <div className="space-y-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-700">
                                Counter Amount (£)
                              </label>
                              <input
                                type="text"
                                value={counterAmount[offer.id] || ""}
                                onChange={(e) => {
                                  const val = e.target.value.replace(
                                    /[^\d.]/g,
                                    ""
                                  );
                                  setCounterAmount({
                                    ...counterAmount,
                                    [offer.id]: val,
                                  });
                                }}
                                placeholder="0.00"
                                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-yellow-500 focus:outline-none focus:ring-1 focus:ring-yellow-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700">
                                Message (optional)
                              </label>
                              <textarea
                                value={counterMessage[offer.id] || ""}
                                onChange={(e) =>
                                  setCounterMessage({
                                    ...counterMessage,
                                    [offer.id]: e.target.value,
                                  })
                                }
                                rows={2}
                                placeholder="Add a message..."
                                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-yellow-500 focus:outline-none focus:ring-1 focus:ring-yellow-500"
                              />
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() =>
                                  handleAction(offer.id, "counter")
                                }
                                disabled={actioningOfferId === offer.id}
                                className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50"
                              >
                                {actioningOfferId === offer.id
                                  ? "Sending..."
                                  : "Send Counter"}
                              </button>
                              <button
                                onClick={() =>
                                  setShowCounterForm({
                                    ...showCounterForm,
                                    [offer.id]: false,
                                  })
                                }
                                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
