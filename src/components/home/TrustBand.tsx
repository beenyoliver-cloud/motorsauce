const highlights = [
  { label: "Payment protected", detail: "Escrow until delivery", tone: "from-emerald-500/10 via-emerald-500/5 to-transparent" },
  { label: "Seller verified", detail: "ID + business checks", tone: "from-blue-500/10 via-blue-500/5 to-transparent" },
  { label: "Returns & disputes", detail: "Humans review every case", tone: "from-amber-500/10 via-amber-500/5 to-transparent" },
];

const soldTicker = [
  { buyer: "Alex", item: "Bilstein B12 kit", avatar: "/images/seller1.jpg" },
  { buyer: "Jordan", item: "OEM mirror caps", avatar: "/images/seller2.jpg" },
  { buyer: "Priya", item: "Michelin Pilot Sport 4", avatar: "/images/seller3.jpg" },
];

export default function TrustBand() {
  return (
    <section className="mb-6 sm:mb-8">
      <div className="relative overflow-hidden rounded-2xl border border-slate-900/10 bg-slate-900 text-white px-4 py-6 sm:px-6">
        <div className="absolute inset-0 trustband-diagonal" />
        <div className="absolute inset-0 opacity-40 mix-blend-screen" style={{ backgroundImage: "radial-gradient(circle at 20% 20%, #facc15 0%, transparent 45%)" }} />
        <div className="relative z-10 flex flex-col gap-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div className="flex-1 space-y-2">
              <p className="text-xs uppercase tracking-[0.4em] text-white/70">Trust & protection</p>
              <h3 className="text-2xl sm:text-3xl font-black">Confidence built-in for every deal.</h3>
              <p className="text-sm text-white/80">Escrowed payments, verified sellers, and humans on support when you need them.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <a href="/about" className="px-4 py-2 rounded-full bg-white text-slate-900 font-semibold text-sm hover:translate-y-0.5 transition">
                How protection works
              </a>
              <a href="/terms" className="px-4 py-2 rounded-full border border-white/40 text-white text-sm hover:bg-white/10 transition">
                Trust & safety
              </a>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {highlights.map((item, idx) => (
              <div
                key={item.label}
                className={`relative overflow-hidden rounded-xl border border-white/10 bg-white/5 px-3 py-3 flex flex-col gap-1`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${item.tone} opacity-70`} />
                <div className="relative z-10">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/70">0{idx + 1}</p>
                  <p className="text-base font-semibold text-white">{item.label}</p>
                  <p className="text-sm text-white/80">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 rounded-xl bg-white/10 border border-white/10 px-3 py-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-black/30 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]">
              Live
            </div>
            <div className="flex gap-3 overflow-x-auto scrollbar-hide">
              {soldTicker.map((sale) => (
                <div key={sale.item} className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm">
                  <img src={sale.avatar} alt="" className="h-6 w-6 rounded-full border border-white/30 object-cover" />
                  <span className="text-white/90">
                    {sale.buyer} bought <strong className="text-white">{sale.item}</strong>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
