import Link from "next/link";
import {
  Gauge,
  Layers,
  Sparkles,
  ShieldCheck,
  MessageSquare,
  CheckCircle2,
} from "lucide-react";

const pillars = [
  {
    title: "Exact-fit search",
    description:
      "Search flows prioritise make, model, generation, engine, VIN, and OEM references so you land on compatible parts the first time.",
    icon: Gauge,
  },
  {
    title: "Structured inventory",
    description:
      "Listings plug into 14 main categories with 100+ subcategories, letting buyers filter by the language mechanics actually use.",
    icon: Layers,
  },
  {
    title: "Tools for both sides",
    description:
      "Saved searches, seller storefronts, garage matching, and watchlists all live natively in Motorsource—no spreadsheets required.",
    icon: Sparkles,
  },
];

const safeguards = [
  {
    title: "Verified sellers & ratings",
    description:
      "Profiles surface location, response rates, documents, and recent reviews so you know who you are dealing with.",
    icon: ShieldCheck,
  },
  {
    title: "Guided, auditable messaging",
    description:
      "Conversations stay on-platform with prompts for VINs, photos, and receipts, giving both sides a clear audit trail.",
    icon: MessageSquare,
  },
  {
    title: "Community quality controls",
    description:
      "Flagging, OEM checks, and category-specific requirements keep listings honest and remove bad actors fast.",
    icon: CheckCircle2,
  },
];

export default function AboutPage() {
  return (
    <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      <div className="rounded-3xl border border-gray-200 bg-white p-8 sm:p-10 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-yellow-600">
          Built by enthusiasts for enthusiasts
        </p>
        <h1 className="mt-3 text-3xl sm:text-4xl font-black text-black tracking-tight">
          About Motorsource
        </h1>
        <p className="mt-4 text-lg text-gray-700 leading-relaxed">
          Motorsource is the marketplace dedicated entirely to automotive parts. Every feature we
          ship is aimed at removing the guesswork from sourcing exact-fit components and giving
          sellers the trust signals they deserve.
        </p>
        <div className="mt-6 inline-flex flex-wrap gap-3">
          <Link
            href="/categories/compatibility"
            className="inline-flex items-center rounded-full bg-yellow-500 px-5 py-2 text-sm font-semibold text-black hover:bg-yellow-400"
          >
            Start searching parts
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center rounded-full border border-gray-300 px-5 py-2 text-sm font-semibold text-gray-800 hover:border-yellow-400 hover:text-yellow-700"
          >
            Talk to the team
          </Link>
        </div>
      </div>

      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-black">What we obsess over</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {pillars.map(({ title, description, icon: Icon }) => (
            <article
              key={title}
              className="h-full rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center gap-2">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-50 border border-yellow-100">
                  <Icon className="h-5 w-5 text-yellow-700" aria-hidden />
                </span>
                <h3 className="text-lg font-semibold text-black">{title}</h3>
              </div>
              <p className="mt-3 text-sm text-gray-700 leading-relaxed">{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-[1.2fr_0.8fr]">
        <article className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-2xl font-bold text-black">Why we built Motorsource</h2>
          <p className="text-gray-700 leading-relaxed">
            We have spent too many weekends scrolling mixed marketplaces, trying to decode vague
            titles, or chasing sellers who could not confirm whether a part would fit. Motorsource
            exists so that every listing starts with structured data and every buyer can validate fit
            using the same filters sellers use when creating the listing.
          </p>
          <p className="text-gray-700 leading-relaxed">
            The result is a simpler workflow: tune your garage preferences once, follow trusted
            sellers, set alerts for your OEM references, and get notified the moment a matching
            listing drops.
          </p>
        </article>

        <article className="rounded-2xl border border-gray-200 bg-gradient-to-br from-black via-zinc-900 to-gray-900 p-6 text-white shadow-sm">
          <h3 className="text-xl font-semibold">For garages & resellers</h3>
          <p className="mt-3 text-sm text-white/80 leading-relaxed">
            Bulk-upload spreadsheets, duplicate listings across trims, organise enquiries, and build
            public shopfronts that highlight recent sales—all without paying agency retainers or
            juggling multiple logins.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-white/80">
            <li>• CSV onboarding + photo management support</li>
            <li>• Seller analytics over views, saves, and contact requests</li>
            <li>• Trust badges that grow with positive transactions</li>
          </ul>
        </article>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-black">Trust & safety built in</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {safeguards.map(({ title, description, icon: Icon }) => (
            <article
              key={title}
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center gap-2">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                  <Icon className="h-5 w-5 text-gray-800" aria-hidden />
                </span>
                <h3 className="text-base font-semibold text-black">{title}</h3>
              </div>
              <p className="mt-3 text-sm text-gray-700 leading-relaxed">{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-gray-200 bg-white p-8 sm:p-10 shadow-sm text-center">
        <h2 className="text-2xl font-bold text-black">Building the future of parts commerce</h2>
        <p className="mt-3 text-gray-700">
          We ship improvements weekly. If you have feedback, inventory to import, or product ideas,
          we would love to hear them.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Link
            href="/sell"
            className="inline-flex items-center rounded-full bg-yellow-500 px-5 py-2 text-sm font-semibold text-black hover:bg-yellow-400"
          >
            Start selling
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center rounded-full border border-gray-300 px-5 py-2 text-sm font-semibold text-gray-800 hover:border-yellow-400 hover:text-yellow-700"
          >
            Share feedback
          </Link>
        </div>
      </section>
    </section>
  );
}
