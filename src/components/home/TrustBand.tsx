const highlights = [
  "Payments held in escrow until delivery confirmed",
  "Verified seller IDs & strike system",
  "Dedicated dispute team for every order",
  "Secure messaging and photo evidence upload",
];

export default function TrustBand() {
  return (
    <section className="mb-8">
      <div className="relative overflow-hidden rounded-3xl border border-slate-900/10 bg-slate-900 text-white px-4 py-6 sm:px-6">
        <div className="absolute inset-0 trustband-diagonal" />
        <div className="absolute inset-0 opacity-40 mix-blend-screen" style={{ backgroundImage: "radial-gradient(circle at 20% 20%, #facc15 0%, transparent 45%)" }} />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="flex-1 space-y-2">
            <p className="text-xs uppercase tracking-[0.4em] text-white/70">Safety systems</p>
            <h3 className="text-2xl sm:text-3xl font-black">We keep trades protected end-to-end.</h3>
            <p className="text-sm text-white/80">Escrowed payments, verified business profiles, and human support that actually replies.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <a href="/about" className="px-4 py-2 rounded-full bg-white text-slate-900 font-semibold text-sm hover:translate-y-0.5 transition">
              How protection works
            </a>
            <a href="/terms" className="px-4 py-2 rounded-full border border-white/40 text-white text-sm hover:bg-white/10 transition">
              Trust & safety policy
            </a>
          </div>
        </div>

        <div className="trustband-marquee mt-5">
          <div className="trustband-marquee__track">
            {[...highlights, ...highlights].map((item, idx) => (
              <span key={`${item}-${idx}`} className="trustband-pill">
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
