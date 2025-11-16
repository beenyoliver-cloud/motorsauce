export default function TrustBand() {
  return (
    <section className="mb-8">
      <div className="rounded-2xl border border-gray-200 bg-white p-4 md:p-5 flex flex-col sm:flex-row items-center justify-between gap-3 hover:shadow-md hover:border-yellow-300 transition-all duration-300 animate-fadeIn">
        <div className="text-sm text-gray-800">
          <span className="font-semibold text-black">Buy with confidence.</span> Message sellers, report issues, and check profiles.
        </div>
        <div className="flex items-center gap-2 text-sm">
          <a href="/about" className="px-3 py-1.5 rounded-full bg-gray-100 text-gray-800 hover:bg-yellow-100 hover:text-yellow-700 hover:border-yellow-400 border border-transparent transition-all duration-300 transform hover:scale-105">How it works</a>
          <a href="/privacy" className="px-3 py-1.5 rounded-full bg-gray-100 text-gray-800 hover:bg-yellow-100 hover:text-yellow-700 hover:border-yellow-400 border border-transparent transition-all duration-300 transform hover:scale-105">Privacy</a>
          <a href="/terms" className="px-3 py-1.5 rounded-full bg-gray-100 text-gray-800 hover:bg-yellow-100 hover:text-yellow-700 hover:border-yellow-400 border border-transparent transition-all duration-300 transform hover:scale-105">Terms</a>
        </div>
      </div>
    </section>
  );
}
