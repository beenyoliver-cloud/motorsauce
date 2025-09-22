"use client";

import Link from "next/link";
import { useCallback, useMemo, useRef, useState } from "react";
import { Share2, MessageSquare, ShoppingCart, PoundSterling, X } from "lucide-react";
import FavoriteButton from "@/components/FavoriteButton";
import ReportUserButton from "@/components/ReportUserButton";
import { useRouter } from "next/navigation";

export default function ListingActions({
  listingId,
  sellerName,
  buyHref,
  shareUrl,
  listingTitle,
}: {
  listingId: string | number;
  sellerName: string;
  buyHref: string;
  shareUrl: string;      // can be relative (e.g., "/listings/123")
  listingTitle?: string; // optional: used in the offer body
}) {
  const router = useRouter();

  // ---- Share helper (native share if available, otherwise copy link) ----
  const share = useCallback(async () => {
    try {
      const url = new URL(shareUrl, window.location.origin).toString();
      // @ts-ignore - older TS libdom may not type navigator.share
      if (navigator.share) {
        // @ts-ignore
        await navigator.share({ title: "Motorsauce listing", url });
      } else {
        await navigator.clipboard.writeText(url);
        alert("Link copied to clipboard");
      }
    } catch {
      // no-op
    }
  }, [shareUrl]);

  // ---- Offer modal state / helpers ----
  const [offerOpen, setOfferOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const openOffer = () => {
    setOfferOpen(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };
  const closeOffer = () => {
    setOfferOpen(false);
    setError(null);
    setAmount("");
  };

  const parsedAmount = useMemo(() => {
    const n = Number(amount.replace(/[^\d.]/g, ""));
    return Number.isFinite(n) ? n : NaN;
  }, [amount]);

  const submitOffer = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!amount.trim()) return setError("Please enter an amount.");
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return setError("Enter a valid amount greater than £0.");
    }
    const body =
      `Hi ${sellerName}, I’d like to offer £${parsedAmount.toFixed(2)} ` +
      `for "${listingTitle || `listing #${String(listingId)}`}".`;
    closeOffer();
    router.push(`/messages/new?to=${encodeURIComponent(sellerName)}&body=${encodeURIComponent(body)}`);
  };

  // ---- Button style tokens (higher contrast) ----
  const btnPrimary =
    "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-yellow-500 text-black font-semibold hover:bg-yellow-600 transition shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 focus-visible:ring-offset-2";
  const btnSecondary =
    "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md border border-gray-500 bg-white text-gray-900 hover:bg-gray-100 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2";
  const btnMessage =
    "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-gray-900 text-white hover:bg-gray-800 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2";

  return (
    <>
      {/* Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {/* Buy now — primary CTA spans full width on its row */}
        <Link href={buyHref} className={`col-span-2 md:col-span-4 ${btnPrimary}`} aria-label="Buy now">
          <ShoppingCart className="h-4 w-4" />
          Buy now
        </Link>

        {/* Make an offer (opens modal) */}
        <button type="button" onClick={openOffer} className={btnSecondary} aria-label="Make an offer">
          <PoundSterling className="h-4 w-4" />
          Make an offer
        </button>

        {/* Message seller — DARK for contrast */}
        <Link
          href={`/messages/new?to=${encodeURIComponent(sellerName)}`}
          className={btnMessage}
          aria-label={`Message ${sellerName}`}
        >
          <MessageSquare className="h-4 w-4" />
          <span className="whitespace-nowrap">Message seller</span>
        </Link>

        {/* Save (favorites) */}
        <div>
          <FavoriteButton listingId={listingId} />
        </div>

        {/* Share */}
        <button type="button" onClick={share} className={btnSecondary} aria-label="Share listing">
          <Share2 className="h-4 w-4" />
          Share
        </button>

        {/* Report user */}
        <ReportUserButton sellerName={sellerName} />
      </div>

      {/* ---- Offer Modal ---- */}
      {offerOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-end md:items-center justify-center p-0 md:p-4"
          onClick={closeOffer}
          aria-modal="true"
          role="dialog"
          aria-labelledby="offer-title"
        >
          <div
            className="w-full md:max-w-md bg-white rounded-t-2xl md:rounded-2xl shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h2 id="offer-title" className="text-base font-semibold text-black">
                Make an offer
              </h2>
              <button
                type="button"
                className="p-1 rounded hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300"
                onClick={closeOffer}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form className="px-4 pt-3 pb-4 grid gap-3" onSubmit={submitOffer}>
              <label className="grid gap-1">
                <span className="text-sm text-gray-800">Your offer (GBP)</span>
                <div className="flex items-center gap-0">
                  <span className="inline-flex items-center px-3 py-2 border border-gray-500 rounded-l-md bg-gray-50 text-gray-900">
                    £
                  </span>
                  <input
                    ref={inputRef}
                    value={amount}
                    onChange={(e) => {
                      setAmount(e.target.value);
                      if (error) setError(null);
                    }}
                    inputMode="decimal"
                    placeholder="0.00"
                    className="flex-1 border border-gray-500 rounded-r-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    aria-invalid={!!error}
                    aria-describedby={error ? "offer-error" : undefined}
                  />
                </div>
                {error && (
                  <span id="offer-error" className="text-xs text-red-600">
                    {error}
                  </span>
                )}
              </label>

              <div className="mt-1 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={closeOffer}
                  className="px-3 py-2 rounded-md border border-gray-500 bg-white text-gray-900 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-md bg-yellow-500 text-black font-semibold hover:bg-yellow-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400"
                >
                  Send offer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
