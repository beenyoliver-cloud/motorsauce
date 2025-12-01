"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MessageSquare, TrendingUp, Clock, CheckCircle, XCircle } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase";
import { displayName } from "@/lib/names";

type OfferWithThread = {
  id: string;
  amount: number;
  status: string;
  message: string | null;
  counter_amount: number | null;
  counter_message: string | null;
  created_at: string;
  expires_at: string | null;
  listing_id: string;
  buyer_id: string;
  buyer_name: string;
  buyer_avatar: string | null;
  thread_id: string | null;
  listing_title: string | null;
};

export default function OffersInbox() {
  const [offers, setOffers] = useState<OfferWithThread[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadOffersWithThreads() {
      try {
        const supabase = supabaseBrowser();
        
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Get offers on listings owned by current user
        const { data: offersData, error: offersError } = await supabase
          .from("offers")
          .select(`
            id,
            amount,
            status,
            message,
            counter_amount,
            counter_message,
            created_at,
            expires_at,
            listing_id,
            starter,
            listings!inner (
              id,
              title,
              user_id
            )
          `)
          .eq("listings.user_id", user.id)
          .order("created_at", { ascending: false });

        if (offersError) {
          console.error("[OffersInbox] Error loading offers:", offersError);
          return;
        }

        if (!offersData || offersData.length === 0) {
          setOffers([]);
          setLoading(false);
          return;
        }

        // Get buyer profiles
        const buyerIds = [...new Set(offersData.map((o: any) => o.starter))];
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, name, avatar")
          .in("id", buyerIds);

        const profilesMap = new Map(
          (profilesData || []).map(p => [p.id, p])
        );

        // Get threads for these listings and buyers
        const { data: threadsData } = await supabase
          .from("threads")
          .select("id, participant_1_id, participant_2_id, listing_ref")
          .or(`participant_1_id.eq.${user.id},participant_2_id.eq.${user.id}`)
          .in("listing_ref", offersData.map((o: any) => o.listing_id));

        const threadsMap = new Map(
          (threadsData || []).map(t => {
            const otherId = t.participant_1_id === user.id ? t.participant_2_id : t.participant_1_id;
            return [`${otherId}-${t.listing_ref}`, t.id];
          })
        );

        // Combine data
        const enrichedOffers: OfferWithThread[] = offersData.map((offer: any) => {
          const buyer = profilesMap.get(offer.starter);
          const threadKey = `${offer.starter}-${offer.listing_id}`;
          const threadId = threadsMap.get(threadKey);
          
          return {
            id: offer.id,
            amount: offer.amount,
            status: offer.status,
            message: offer.message,
            counter_amount: offer.counter_amount,
            counter_message: offer.counter_message,
            created_at: offer.created_at,
            expires_at: offer.expires_at,
            listing_id: offer.listing_id,
            buyer_id: offer.starter,
            buyer_name: buyer?.name || "Unknown",
            buyer_avatar: buyer?.avatar || null,
            thread_id: threadId || null,
            listing_title: offer.listings?.title || null,
          };
        });

        setOffers(enrichedOffers);
      } catch (err) {
        console.error("[OffersInbox] Unexpected error:", err);
      } finally {
        setLoading(false);
      }
    }

    loadOffersWithThreads();
    
    // Refresh every 30 seconds
    const interval = setInterval(loadOffersWithThreads, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock size={16} className="text-yellow-600" />;
      case "accepted":
        return <CheckCircle size={16} className="text-green-600" />;
      case "rejected":
        return <XCircle size={16} className="text-red-600" />;
      case "countered":
        return <TrendingUp size={16} className="text-blue-600" />;
      default:
        return <Clock size={16} className="text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "text-yellow-700 bg-yellow-50 border-yellow-200";
      case "accepted":
        return "text-green-700 bg-green-50 border-green-200";
      case "rejected":
        return "text-red-700 bg-red-50 border-red-200";
      case "countered":
        return "text-blue-700 bg-blue-50 border-blue-200";
      default:
        return "text-gray-700 bg-gray-50 border-gray-200";
    }
  };

  if (loading) {
    return (
      <div className="p-4 space-y-3">
        {[1, 2].map(i => (
          <div key={i} className="p-3 rounded-lg border border-gray-200 animate-pulse">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-gray-200" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-gray-200 rounded w-2/3" />
                <div className="h-2 bg-gray-100 rounded w-1/2" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (offers.length === 0) {
    return (
      <div className="p-6 text-center">
        <TrendingUp size={32} className="mx-auto text-gray-300 mb-2" />
        <p className="text-sm text-gray-500">No offers yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 p-3">
      {offers.map((offer) => {
        const isExpired = offer.expires_at && new Date(offer.expires_at) < new Date();
        const displayAmount = offer.status === "countered" && offer.counter_amount 
          ? offer.counter_amount 
          : offer.amount;

        return (
          <div
            key={offer.id}
            className={`p-3 rounded-lg border transition ${getStatusColor(offer.status)}`}
          >
            <div className="flex items-start gap-3 mb-2">
              <div className="h-10 w-10 rounded-full overflow-hidden border-2 border-white shrink-0 bg-gray-100">
              {offer.buyer_avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={offer.buyer_avatar}
                  alt={displayName(offer.buyer_name)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-yellow-500 flex items-center justify-center text-black font-bold text-xs">
                  {(offer.buyer_name || "?").slice(0, 2).toUpperCase()}
                </div>
              )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-gray-900 truncate">
                    {displayName(offer.buyer_name)}
                  </span>
                  {getStatusIcon(offer.status)}
                </div>
                <p className="text-xs text-gray-600 truncate mb-1">
                  {offer.listing_title || `Listing #${offer.listing_id.slice(0, 8)}`}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-gray-900">
                    £{displayAmount.toLocaleString()}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full border font-medium capitalize">
                    {offer.status}
                    {isExpired && offer.status === "pending" && " (expired)"}
                  </span>
                </div>
              </div>
            </div>

            {offer.thread_id ? (
              <Link
                href={`/messages/${offer.thread_id}`}
                className="flex items-center justify-center gap-2 w-full mt-2 px-3 py-2 bg-white text-gray-900 rounded-lg text-sm font-medium hover:bg-gray-50 transition border border-gray-300"
              >
                <MessageSquare size={16} />
                View conversation
              </Link>
            ) : (
              <div className="mt-2 px-3 py-2 bg-white/50 text-gray-500 rounded-lg text-xs text-center border border-gray-200">
                No conversation yet
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
