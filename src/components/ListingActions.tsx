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
  sellerId,
  buyHref,
  shareUrl,
  listingTitle,
}: {
  listingId: string | number;
  sellerName: string;
  sellerId?: string;     // optional: seller user ID for reports
  buyHref: string;
  shareUrl: string;      // can be relative (e.g., "/listings/123")
  listingTitle?: string; // optional: used in the offer body
}) {
  const router = useRouter();

  // ---- Share helper (native share if available, otherwise copy link) ----
  const share = useCallback(async () => {
    try {
      const url = new URL(shareUrl, window.location.origin).toString();
      type NavigatorShare = Navigator & { share?: (data: { title?: string; text?: string; url?: string }) => Promise<void> };
      const nav = navigator as NavigatorShare;
      if (typeof nav.share === "function") {
        await nav.share({ title: "Motorsource listing", url });
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
    closeOffer();
    // Redirect to messages where offer can be made through proper flow
    router.push("/messages");
  };

  // ---- Button style tokens (higher contrast) ----
  const btnPrimary =
    "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-yellow-500 text-black font-semibold hover:bg-yellow-600 transition shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 focus-visible:ring-offset-2";
  const btnSecondary =
    "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md border border-gray-500 bg-white text-gray-900 hover:bg-gray-100 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2";
  const btnMessage =
    "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-yellow-500 text-black hover:bg-yellow-600 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 focus-visible:ring-offset-2";

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
        <button
          type="button"
          onClick={() => {
            if (!sellerId) {
              alert("Unable to message seller - seller ID not available.");
              return;
            }
            router.push("/messages");
          }}
          className={btnMessage}
          aria-label={`Message ${sellerName}`}
        >
          <MessageSquare className="h-4 w-4" />
          <span className="whitespace-nowrap">Message seller</span>
        </button>

        {/* Save (favorites) */}
        <div>
          <FavoriteButton listingId={listingId} />
        </div>

        {/* Share */}
        <button type="button" onClick={share} className={btnSecondary} aria-label="Share listing">
          <Share2 className="h-4 w-4" />
          Share
        </button>

        {/* Report user - only show if we have sellerId */}
        {sellerId && <ReportUserButton sellerName={sellerName} sellerId={sellerId} />}
      </div>

      {/* ---- Offer Modal ---- */}
      {offerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4"
          aria-modal="true"
          role="dialog"
          aria-labelledby="offer-title"
        >
          <div className="absolute inset-0 bg-slate-200/70" onClick={closeOffer} />
          <div
            className="w-full md:max-w-md bg-white rounded-t-3xl md:rounded-2xl shadow-xl animate-[offerSheet_320ms_cubic-bezier(.25,.8,.25,1)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h2 id="offer-title" className="text-base font-semibold text-black">
                Make an offer
              </h2>
              <button
                type="button"
                className="px-2 py-1 rounded-md hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300"
                onClick={closeOffer}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form className="px-5 pt-4 pb-5 grid gap-4" onSubmit={submitOffer}>
              <label className="grid gap-2">
                <span className="text-sm font-medium text-gray-800">Your offer (GBP)</span>
                <div className="flex items-center gap-0 rounded-md overflow-hidden border border-gray-500 bg-white">
                  <span className="inline-flex items-center px-3 py-2 text-gray-900 font-semibold bg-gray-50">£</span>
                  <input
                    ref={inputRef}
                    value={amount}
                    onChange={(e) => {
                      setAmount(e.target.value);
                      if (error) setError(null);
                    }}
                    inputMode="decimal"
                    placeholder="0.00"
                    className="flex-1 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400"
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

              {/* Quick adjust buttons */}
              <div className="flex flex-wrap gap-2">
                {[
                  ["-10%", -0.1],
                  ["-5%", -0.05],
                  ["+5%", 0.05],
                  ["+10%", 0.1],
                ].map(([label, pct]) => (
                  <button
                    type="button"
                    key={label}
                    disabled={!parsedAmount || !Number.isFinite(parsedAmount)}
                    onClick={() => {
                      if (!parsedAmount || !Number.isFinite(parsedAmount)) return;
                      const adjusted = parsedAmount * (1 + (pct as number));
                      setAmount(adjusted.toFixed(2));
                    }}
                    className="px-3 py-1.5 rounded-md border border-gray-300 text-xs font-medium bg-white text-gray-900 hover:bg-gray-50 disabled:opacity-40"
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-end gap-3 mt-1">
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
          <style jsx>{`
            @keyframes offerSheet { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
          `}</style>
        </div>
      )}
    </>
  );
}
