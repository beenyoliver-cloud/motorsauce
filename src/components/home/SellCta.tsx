import Link from "next/link";

export default function SellCta() {
  return (
    <section className="mb-8">
      <div className="rounded-2xl border border-yellow-500 bg-gradient-to-r from-yellow-400 to-yellow-500 p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-3 hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] animate-fadeIn">
        <div>
          <h3 className="text-lg sm:text-xl font-extrabold text-black">Got parts to sell?</h3>
          <p className="text-sm text-black/80">List your part in minutes and reach buyers today.</p>
        </div>
        <Link href="/sell" className="rounded-full bg-black text-white px-4 py-2 font-semibold hover:bg-gray-800 hover:scale-105 transition-all duration-300 shadow-md hover:shadow-lg active:scale-95">List a part</Link>
      </div>
    </section>
  );
}
