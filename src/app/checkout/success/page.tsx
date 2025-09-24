// src/app/checkout/success/page.tsx
export const dynamic = "force-dynamic";

async function getListing(id: string) {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "";
  const res = await fetch(`${base}/api/listings?id=${encodeURIComponent(id)}`, {
    cache: "no-store",
  });
  if (!res.ok) return null;
  return res.json();
}

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: { id?: string };
}) {
  const id = searchParams?.id;
  const listing = id ? await getListing(id) : null;

  return (
    <main className="px-6 sm:px-8 md:px-12 py-12 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-3">Payment successful 🎉</h1>
      <p className="text-gray-700 mb-8">
        Thanks for your purchase. We’ve sent a confirmation email with your order details.
      </p>

      {listing ? (
        <div className="flex items-start gap-4 border border-gray-200 rounded-lg p-4 bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={listing.image}
            alt={listing.title}
            className="h-24 w-32 rounded-md object-cover bg-gray-100"
          />
          <div className="flex-1">
            <div className="text-sm uppercase text-gray-500 mb-1">{listing.category}</div>
            <div className="text-lg font-semibold">{listing.title}</div>
            <div className="text-yellow-600 font-bold mt-1">{listing.price}</div>
          </div>
        </div>
      ) : (
        <div className="rounded-md border border-gray-200 bg-white p-6">
          <div className="text-gray-700">
            Your order is confirmed.{" "}
            <a href="/" className="text-yellow-600 underline font-semibold">
              Continue shopping
            </a>
            .
          </div>
        </div>
      )}
    </main>
  );
}
