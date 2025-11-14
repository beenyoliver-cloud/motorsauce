export default function TrustBand() {
  return (
    <section className="mb-8">
      <div className="rounded-2xl border border-gray-200 bg-white p-4 md:p-5 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="text-sm text-gray-800">
          <span className="font-semibold text-black">Buy with confidence.</span> Message sellers, report issues, and check profiles.
        </div>
        <div className="flex items-center gap-2 text-sm">
          <a href="/about" className="px-3 py-1.5 rounded-full border border-gray-300 hover:bg-gray-50">How it works</a>
          <a href="/privacy" className="px-3 py-1.5 rounded-full border border-gray-300 hover:bg-gray-50">Privacy</a>
          <a href="/terms" className="px-3 py-1.5 rounded-full border border-gray-300 hover:bg-gray-50">Terms</a>
        </div>
      </div>
    </section>
  );
}
