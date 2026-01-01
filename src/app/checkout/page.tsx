"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Cart, calcTotals, getCart, setShipping, clearCart } from "@/lib/cartStore";
import { formatGBP } from "@/lib/currency";
import { resolveListingImage } from "@/lib/image";
import { getCurrentUser } from "@/lib/auth";
import { supabaseBrowser } from "@/lib/supabase";

type Address = {
  fullName: string;
  email: string;
  line1: string;
  line2?: string;
  city: string;
  postcode: string;
};

type OfferCheckout = {
  offerId: string;
  listingId: string;
  title: string;
  image: string;
  offerPrice: number;
  originalPrice: number;
  sellerId: string;
  sellerName: string;
};

function CheckoutLoading() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-6">
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-yellow-500 border-t-transparent"></div>
      </div>
    </section>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<CheckoutLoading />}>
      <CheckoutContent />
    </Suspense>
  );
}

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const offerId = searchParams.get("offer_id");
  
  const [offerCheckout, setOfferCheckout] = useState<OfferCheckout | null>(null);
  const [loadingOffer, setLoadingOffer] = useState(!!offerId);
  const [offerError, setOfferError] = useState<string | null>(null);
  
  // Require login to buy
  useEffect(() => {
    (async () => {
      const u = await getCurrentUser();
      if (!u) {
        router.replace(`/auth/login?next=${encodeURIComponent('/checkout' + (offerId ? `?offer_id=${offerId}` : ''))}`);
      }
    })();
  }, [router, offerId]);
  
  // Fetch offer details if offer_id is present
  useEffect(() => {
    if (!offerId) return;
    
    async function fetchOffer() {
      setLoadingOffer(true);
      setOfferError(null);
      
      try {
        const supabase = supabaseBrowser();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setOfferError("Please log in to continue");
          return;
        }
        
        // Fetch the offer with listing details
        const { data: offer, error } = await supabase
          .from("offers")
          .select(`
            id,
            amount,
            status,
            created_by_user_id,
            listing_id,
            conversation:conversation_id (buyer_user_id, seller_user_id),
            listings:listing_id (
              id,
              title,
              price,
              images,
              seller_id,
              status
            )
          `)
          .eq("id", offerId)
          .single();
        
        if (error || !offer) {
          setOfferError("Offer not found");
          return;
        }
        
        // Verify the user is the buyer (conversation buyer)
        const conversation = Array.isArray(offer.conversation) ? offer.conversation[0] : offer.conversation;
        if (conversation?.buyer_user_id && conversation.buyer_user_id !== user.id) {
          setOfferError("This offer doesn't belong to you");
          return;
        }
        
        // Verify the offer is accepted
        if (offer.status !== "ACCEPTED") {
          setOfferError("This offer has not been accepted");
          return;
        }
        
        const listing = offer.listings as any;
        
        // Verify the listing is still active
        if (listing?.status !== "active") {
          setOfferError("This listing is no longer available");
          return;
        }
        
        // Fetch seller info
        const { data: seller } = await supabase
          .from("profiles")
          .select("name")
          .eq("id", listing.seller_id)
          .single();
        
        setOfferCheckout({
          offerId: offer.id,
          listingId: listing.id,
          title: listing.title,
          image: listing.images?.[0] || "/images/placeholder.png",
          offerPrice: (offer.amount || 0) / 100,
          originalPrice: listing.price,
          sellerId: listing.seller_id,
          sellerName: seller?.name || "Seller",
        });
      } catch (err) {
        console.error("Error fetching offer:", err);
        setOfferError("Failed to load offer details");
      } finally {
        setLoadingOffer(false);
      }
    }
    
    fetchOffer();
  }, [offerId]);
  
  const [cart, setCart] = useState<Cart>(getCart());
  const [addr, setAddr] = useState<Address>(() => readAddress());
  const [agree, setAgree] = useState(false);
  
  // Calculate totals based on offer or cart
  const totals = useMemo(() => {
    if (offerCheckout) {
      const itemsSubtotal = offerCheckout.offerPrice;
      const serviceFee = Math.max(0.5, Math.round(itemsSubtotal * 0.025 * 100) / 100);
      const shipping = cart.shipping === "standard" ? 4.99 : 0;
      const total = itemsSubtotal + serviceFee + shipping;
      return { itemsSubtotal, serviceFee, shipping, total };
    }
    return calcTotals(cart);
  }, [cart, offerCheckout]);

  useEffect(() => {
    const onChange = () => setCart(getCart());
    window.addEventListener("ms:cart", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("ms:cart", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const hasItems = offerCheckout || cart.items.length > 0;
  const disabled = !hasItems || !isAddressValid(addr) || !agree;
  const [paying, setPaying] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  async function payWithStripe() {
    if (disabled || paying) return;
    setPaying(true);
    setCheckoutError(null);
    try {
      const supabase = supabaseBrowser();
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        setCheckoutError("Please sign in to continue.");
        return;
      }

      // Build payload - include offer_id if present
      const body = offerCheckout
        ? {
            offer_id: offerCheckout.offerId,
            shipping: cart.shipping,
            address: addr,
          }
        : {
            items: cart.items.map((i) => ({ id: i.id, qty: i.qty })),
            shipping: cart.shipping,
            address: addr,
          };
      
      const res = await fetch("/api/checkout/session", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.session.access_token}`,
        },
        body: JSON.stringify(body),
      });
  if (!res.ok) {
        // Don't silently redirect to success anymore — it's too confusing when the
        // server is misconfigured (e.g. missing SUPABASE_SERVICE_ROLE_KEY / STRIPE_SECRET_KEY).
        // Instead, show a clear message and keep the user on the checkout page.
    const data = await res.json().catch(() => ({} as any));
    const msg = typeof data?.error === "string" ? data.error : "";
    const hint = typeof data?.hint === "string" ? data.hint : "";
    const details = typeof data?.details === "string" ? data.details : "";

        if (res.status === 401) {
          setCheckoutError("Please sign in again to continue checkout.");
          return;
        }

        if (res.status === 503) {
          setCheckoutError("Checkout is temporarily unavailable. Please try again in a few minutes.");
          return;
        }

        if (res.status === 500 && (msg.toLowerCase().includes("configuration") || msg.toLowerCase().includes("server"))) {
          setCheckoutError("Checkout is temporarily offline due to a server configuration issue. Please try again later.");
          return;
        }

        if (msg === "DB error") {
          const extra = hint || details;
          setCheckoutError(extra ? `Checkout is temporarily unavailable (${extra}).` : "Checkout is temporarily unavailable (database error).");
          return;
        }

        setCheckoutError(msg || "We couldn't start secure checkout. Please try again.");
        return;
      }
      const json = await res.json();
      if (json?.url) {
        window.location.href = json.url;
        return;
      }
      setCheckoutError("We couldn't start secure checkout. Please try again.");
    } catch {
      setCheckoutError("We couldn't start secure checkout. Please try again.");
    } finally {
      setPaying(false);
    }
  }
  
  // Show loading state for offer
  if (loadingOffer) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-6">
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-yellow-500 border-t-transparent"></div>
        </div>
      </section>
    );
  }
  
  // Show error state for offer
  if (offerId && offerError) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-4">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-800 hover:text-black"
            aria-label="Go back"
          >
            <span className="text-lg">←</span> Back
          </button>
        </div>
        <h1 className="text-2xl font-extrabold text-gray-900 mb-3">Checkout</h1>
        <div className="rounded-xl border border-red-200 bg-red-50 p-8">
          <p className="text-red-800 mb-4">{offerError}</p>
          <Link
            href="/offers"
            className="inline-flex px-4 py-2 rounded-md bg-yellow-500 text-black font-semibold hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-400"
          >
            View My Offers
          </Link>
        </div>
      </section>
    );
  }

  if (!hasItems) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-4">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-800 hover:text-black"
            aria-label="Go back"
          >
            <span className="text-lg">←</span> Back
          </button>
        </div>
        <h1 className="text-2xl font-extrabold text-gray-900 mb-3">Checkout</h1>
        <div className="rounded-xl border border-gray-200 bg-white p-8">
          <p className="text-gray-900 mb-4">Your basket is empty.</p>
          <Link
            href="/search"
            className="inline-flex px-4 py-2 rounded-md bg-yellow-500 text-black font-semibold hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-400"
          >
            Find parts
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-6">
      {/* Top bar */}
      <div className="mb-4 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-800 hover:text-black"
          aria-label="Go back"
        >
          <span className="text-lg">←</span> Back
        </button>
        <h1 className="text-2xl font-extrabold text-gray-900">Checkout</h1>
      </div>
      <p className="text-gray-700 mb-6">Enter delivery details and confirm your order.</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Delivery details</h2>

          {checkoutError && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              {checkoutError}{" "}
              <span className="text-red-700">
                If you believe you were charged, please contact support and include reference{" "}
                <span className="font-mono">MS-ORDER</span>.
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <TextField label="Full name" value={addr.fullName} onChange={(v) => setAddr({ ...addr, fullName: v })} />
            <TextField label="Email" type="email" value={addr.email} onChange={(v) => setAddr({ ...addr, email: v })} />
          </div>
          <TextField label="Address line 1" value={addr.line1} onChange={(v) => setAddr({ ...addr, line1: v })} />
          <TextField label="Address line 2 (optional)" value={addr.line2 || ""} onChange={(v) => setAddr({ ...addr, line2: v })} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <TextField label="Town/City" value={addr.city} onChange={(v) => setAddr({ ...addr, city: v })} />
            <TextField label="Postcode" value={addr.postcode} onChange={(v) => setAddr({ ...addr, postcode: v })} />
          </div>

          <div className="mt-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Shipping method</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <ShipOption
                name="Standard delivery"
                detail="2–4 business days"
                price="£4.99"
                selected={cart.shipping === "standard"}
                onSelect={() => setShipping("standard")}
              />
              <ShipOption
                name="Free collection"
                detail="Arrange with seller"
                price="£0.00"
                selected={cart.shipping === "collection"}
                onSelect={() => setShipping("collection")}
              />
            </div>
          </div>

          <label className="mt-5 flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-1" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
            <span className="text-gray-900">
              I agree to the <Link href="/terms" className="underline hover:text-black">Terms</Link> and{" "}
              <Link href="/privacy" className="underline hover:text-black">Privacy Policy</Link>.
            </span>
          </label>

          {/* Primary Stripe Checkout Button */}
          <button
            onClick={payWithStripe}
            disabled={disabled || paying}
            className={`mt-4 w-full inline-flex items-center justify-center px-5 py-3 rounded-md font-semibold ${
              disabled || paying
                ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                : "bg-yellow-500 text-black hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-400"
            }`}
          >
            {paying ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Redirecting to secure checkout...
              </>
            ) : (
              <>
                Continue to secure payment
              </>
            )}
          </button>
          
          <p className="mt-2 text-xs text-center text-gray-600">
            You&apos;ll be redirected to Stripe&apos;s secure checkout to enter payment details
          </p>
        </div>

        {/* Summary (with thumbnails via resolver) */}
        <aside className="rounded-xl border border-gray-200 bg-white p-4 lg:sticky lg:top-[72px] h-fit">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Order summary</h2>

          {/* Offer-based checkout */}
          {offerCheckout && (
            <div className="mb-3">
              <div className="py-2 flex items-center gap-3">
                <div className="h-14 w-16 rounded-md overflow-hidden border border-gray-200 bg-gray-50">
                  <Image 
                    src={resolveListingImage({ image: offerCheckout.image, images: undefined, listingImage: undefined })} 
                    alt={offerCheckout.title} 
                    width={128} 
                    height={96} 
                    className="h-full w-full object-cover" 
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-gray-900 line-clamp-2">{offerCheckout.title}</div>
                  <div className="text-[11px] text-gray-700">Sold by {offerCheckout.sellerName}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-semibold text-green-600 whitespace-nowrap">
                    {formatGBP(offerCheckout.offerPrice)}
                  </div>
                  {offerCheckout.originalPrice > offerCheckout.offerPrice && (
                    <div className="text-[11px] text-gray-500 line-through">
                      {formatGBP(offerCheckout.originalPrice)}
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-1 rounded-md bg-green-50 border border-green-200 px-2 py-1">
                <p className="text-xs text-green-700">✓ Accepted offer price</p>
              </div>
            </div>
          )}

          {/* Cart-based checkout */}
          {!offerCheckout && (
            <ul className="mb-3 divide-y divide-gray-100">
              {cart.items.map((it) => {
                const img = resolveListingImage({ image: it.image, images: undefined, listingImage: undefined });
                return (
                  <li key={it.id} className="py-2 flex items-center gap-3">
                    <div className="h-14 w-16 rounded-md overflow-hidden border border-gray-200 bg-gray-50">
                      <Image src={img} alt={it.title} width={128} height={96} className="h-full w-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-gray-900 line-clamp-2">{it.title}</div>
                      <div className="text-[11px] text-gray-700">Qty {it.qty}</div>
                    </div>
                    <div className="text-xs font-semibold text-gray-900 whitespace-nowrap">
                      {formatGBP(it.price * it.qty)}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="space-y-2 text-sm">
            <Row label="Items subtotal" value={formatGBP(totals.itemsSubtotal)} />
            <Row label="Shipping" value={formatGBP(totals.shipping)} />
            <Row label="Service fee" value={formatGBP(totals.serviceFee)} />
            <div className="border-t border-gray-200 pt-2 flex items-center justify-between">
              <span className="font-semibold text-gray-900">Total</span>
              <span className="font-extrabold text-gray-900">{formatGBP(totals.total)}</span>
            </div>
          </div>

          <p className="mt-2 text-xs text-gray-700">You can place an order without payment, or use Stripe if configured.</p>
        </aside>
      </div>
    </section>
  );
}

/* ------------------------- UI bits ------------------------- */

function TextField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-gray-900 mb-1">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
      />
    </label>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-900">{label}</span>
      <span className="text-gray-900 font-medium">{value}</span>
    </div>
  );
}

function ShipOption({
  name,
  detail,
  price,
  selected,
  onSelect,
}: {
  name: string;
  detail: string;
  price: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`text-left border rounded-md p-3 w-full ${
        selected ? "border-yellow-500 ring-2 ring-yellow-200" : "border-gray-300 hover:border-gray-400"
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-gray-900">{name}</div>
          <div className="text-xs text-gray-700">{detail}</div>
        </div>
        <div className="text-sm font-medium text-gray-900">{price}</div>
      </div>
    </button>
  );
}

function isAddressValid(a: Address) {
  return a.fullName && a.email && a.line1 && a.city && a.postcode;
}

const ADDR_KEY = "ms:addr:v1";
function readAddress(): Address {
  if (typeof window === "undefined") {
    return { fullName: "", email: "", line1: "", city: "", postcode: "" };
  }
  try {
    const v = localStorage.getItem(ADDR_KEY);
    return v ? (JSON.parse(v) as Address) : { fullName: "", email: "", line1: "", city: "", postcode: "" };
  } catch {
    return { fullName: "", email: "", line1: "", city: "", postcode: "" };
  }
}
function saveAddress(a: Address) {
  localStorage.setItem(ADDR_KEY, JSON.stringify(a));
}
