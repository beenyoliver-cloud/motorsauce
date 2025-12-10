"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Cart, calcTotals, getCart, setShipping } from "@/lib/cartStore";
import { formatGBP } from "@/lib/currency";
import { resolveListingImage } from "@/lib/image";
import { getCurrentUser } from "@/lib/auth";

type Address = {
  fullName: string;
  email: string;
  line1: string;
  line2?: string;
  city: string;
  postcode: string;
};

export default function CheckoutPage() {
  const router = useRouter();
  // Require login to buy
  useEffect(() => {
    (async () => {
      const u = await getCurrentUser();
      if (!u) {
        router.replace(`/auth/login?next=${encodeURIComponent('/checkout')}`);
      }
    })();
  }, [router]);
  const [cart, setCart] = useState<Cart>(getCart());
  const [addr, setAddr] = useState<Address>(() => readAddress());
  const [agree, setAgree] = useState(false);
  const totals = useMemo(() => calcTotals(cart), [cart]);

  useEffect(() => {
    const onChange = () => setCart(getCart());
    window.addEventListener("ms:cart", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("ms:cart", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const disabled = cart.items.length === 0 || !isAddressValid(addr) || !agree;
  const [paying, setPaying] = useState(false);

  async function placeOrder() {
    saveAddress(addr);
    const orderRef = "MS-" + Math.random().toString(36).slice(2, 8).toUpperCase();
    const snapshot = {
      orderRef,
      placedAt: new Date().toISOString(),
      items: cart.items,
      shipping: cart.shipping,
      address: addr,
      totals,
    };
    const payload = encodeURIComponent(JSON.stringify(snapshot));
    router.push(`/checkout/success?o=${payload}`);
  }

  async function payWithStripe() {
    if (disabled || paying) return;
    setPaying(true);
    try {
      // Build minimal, server-verifiable payload
      const body = {
        items: cart.items.map((i) => ({ id: i.id, qty: i.qty })),
        shipping: cart.shipping,
      };
      const res = await fetch("/api/checkout/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        // Fallback: use local success flow if payments not configured yet
        await placeOrder();
        return;
      }
      const json = await res.json();
      if (json?.url) {
        window.location.href = json.url;
        return;
      }
      await placeOrder();
    } catch {
      await placeOrder();
    } finally {
      setPaying(false);
    }
  }

  if (cart.items.length === 0) {
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
                🔒 Continue to secure payment
              </>
            )}
          </button>
          
          <p className="mt-2 text-xs text-center text-gray-600">
            You'll be redirected to Stripe's secure checkout to enter payment details
          </p>
        </div>

        {/* Summary (with thumbnails via resolver) */}
        <aside className="rounded-xl border border-gray-200 bg-white p-4 lg:sticky lg:top-[72px] h-fit">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Order summary</h2>

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
