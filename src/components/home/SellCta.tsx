import Link from "next/link";

export default function SellCta() {
  return (
    <section className="mb-8">
      <div className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-yellow-300 via-yellow-400 to-amber-400 flex items-center justify-center text-black font-extrabold shadow-sm">
            £
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-gray-900">Sell your parts in minutes</h3>
            <p className="text-sm text-gray-700 mt-1">Create a listing, get buyers, and cash out securely with Stripe.</p>
            <div className="flex flex-wrap gap-2 mt-2 text-xs text-gray-600">
              <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 border border-gray-200">No monthly fees</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 border border-gray-200">Offer & chat built-in</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 border border-gray-200">Boost exposure</span>
            </div>
          </div>
        </div>
        <Link
          href="/sell"
          className="inline-flex items-center gap-2 rounded-md bg-[#0064d2] text-white px-4 py-2 text-sm font-semibold hover:bg-[#0056b3] transition-colors shadow-sm"
        >
          List a part
          <span aria-hidden>→</span>
        </Link>
      </div>
    </section>
  );
}
