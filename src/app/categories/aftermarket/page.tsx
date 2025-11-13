// src/app/categories/aftermarket/page.tsx
import Link from "next/link";
import {
  Wrench,
  Gauge,
  Car,
  Sparkles,
  ShieldAlert,
  Filter,
  Tag,
  Rocket,
  Settings2,
  CheckCircle2,
} from "lucide-react";

export const metadata = {
  title: "Aftermarket Parts | Motorsource",
  description:
    "Shop aftermarket car parts by type, brand, and quick filters. Upgrade, replace, or personalize with trusted aftermarket components.",
};

const PART_TYPES: { label: string; icon: React.ElementType; href: string }[] = [
  { label: "Styling & Exterior", icon: Sparkles, href: "/search?category=Aftermarket&section=Styling" },
  { label: "Performance & Tuning", icon: Rocket, href: "/search?category=Aftermarket&section=Performance" },
  { label: "Brakes & Suspension", icon: Gauge, href: "/search?category=Aftermarket&section=Brakes" },
  { label: "Interior & Comfort", icon: Car, href: "/search?category=Aftermarket&section=Interior" },
  { label: "Service & Maintenance", icon: Wrench, href: "/search?category=Aftermarket&section=Service" },
  { label: "Electronics & Lighting", icon: Settings2, href: "/search?category=Aftermarket&section=Electrical" },
];

const POPULAR_MAKES = [
  "BMW",
  "Audi",
  "Volkswagen",
  "Mercedes-Benz",
  "Ford",
  "Vauxhall",
  "Toyota",
  "Nissan",
  "Honda",
  "Kia",
  "Hyundai",
  "Peugeot",
];

const QUICK_FILTERS: { label: string; href: string; icon?: React.ElementType }[] = [
  { label: "New (aftermarket)", href: "/search?category=Aftermarket&condition=New", icon: Tag },
  { label: "Used (aftermarket)", href: "/search?category=Aftermarket&condition=Used", icon: Tag },
  { label: "Under £50", href: "/search?category=Aftermarket&maxPrice=50", icon: Filter },
  { label: "£50–£200", href: "/search?category=Aftermarket&minPrice=50&maxPrice=200", icon: Filter },
  { label: "Over £200", href: "/search?category=Aftermarket&minPrice=200", icon: Filter },
  { label: "Performance-focused", href: "/search?category=Aftermarket&tag=Performance", icon: Rocket },
];

export default function AftermarketCategoryPage() {
  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
      {/* Breadcrumb */}
      <nav className="mb-4 text-sm text-gray-600">
        <Link href="/" className="hover:text-yellow-600">Home</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-800">Aftermarket Parts</span>
      </nav>

      {/* Hero / Intro */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 md:p-8 shadow-sm">
        <h1 className="text-3xl md:text-4xl font-extrabold text-black tracking-tight">Aftermarket Parts</h1>
        <p className="mt-2 text-gray-700 max-w-2xl">
          Explore upgrades, replacements, and customisations from trusted aftermarket brands.
          Shop by part type, make, or use quick filters to find quality parts that fit your budget and goals.
        </p>
        <div className="mt-5">
          <Link
            href="/search?category=Aftermarket"
            className="inline-block rounded-md bg-yellow-500 hover:bg-yellow-600 text-black font-semibold px-4 py-2"
          >
            Browse all aftermarket parts
          </Link>
        </div>
      </div>

      {/* Shop by Part Type */}
      <section className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="text-xl md:text-2xl font-bold text-black">Shop by part type</h2>
          <Link href="/search?category=Aftermarket" className="text-sm font-medium text-yellow-700 hover:text-yellow-800">
            View all
          </Link>
        </div>

        <ul className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {PART_TYPES.map(({ label, icon: Icon, href }) => (
            <li key={label}>
              <Link
                href={href}
                className="group block rounded-xl border border-gray-200 bg-white p-3 hover:shadow-sm hover:border-yellow-300 transition"
              >
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-yellow-50 group-hover:bg-yellow-100 border border-yellow-200">
                    <Icon className="h-5 w-5 text-yellow-700" aria-hidden />
                  </span>
                  <span className="text-[15px] font-medium text-black group-hover:text-yellow-700">
                    {label}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Shop by Make */}
      <section className="mt-10">
        <h2 className="text-xl md:text-2xl font-bold text-black">Shop by make</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {POPULAR_MAKES.map((make) => (
            <Link
              key={make}
              href={`/search?category=Aftermarket&make=${encodeURIComponent(make)}`}
              className="inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm text-black hover:border-yellow-300 hover:text-yellow-700"
            >
              {make}
            </Link>
          ))}
        </div>
      </section>

      {/* Quick Filters */}
      <section className="mt-10">
        <h2 className="text-xl md:text-2xl font-bold text-black">Quick filters</h2>
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {QUICK_FILTERS.map(({ label, href, icon: Icon }) => (
            <Link
              key={label}
              href={href}
              className="group flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-3 hover:shadow-sm hover:border-yellow-300 transition"
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-yellow-50 group-hover:bg-yellow-100 border border-yellow-200">
                {Icon ? <Icon className="h-4 w-4 text-yellow-700" aria-hidden /> : null}
              </span>
              <span className="text-sm font-medium text-black group-hover:text-yellow-700">{label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Info / Tips */}
      <section className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-black flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-yellow-700" aria-hidden /> Aftermarket vs OEM
          </h3>
          <ul className="mt-3 space-y-2 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-yellow-700" aria-hidden />
              Aftermarket parts are made by third-party brands to fit or improve your vehicle.
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-yellow-700" aria-hidden />
              Look for reputable brands and documented compatibility for your make/model/year.
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-yellow-700" aria-hidden />
              Performance parts can change NVH, emissions, or insurance—check local regs and policies.
            </li>
          </ul>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-black flex items-center gap-2">
            <Wrench className="h-5 w-5 text-yellow-700" aria-hidden /> Buying tips
          </h3>
          <ul className="mt-3 space-y-2 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-yellow-700" aria-hidden />
              Check part numbers, fitment lists, dyno sheets, and install notes where available.
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-yellow-700" aria-hidden />
              Review photos closely for welds, finishes, and connectors to gauge quality.
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-yellow-700" aria-hidden />
              Consider warranty/returns and the seller’s rating before purchasing.
            </li>
          </ul>
        </div>
      </section>

      {/* Final CTA */}
      <div className="mt-10 flex justify-center">
        <Link
          href="/search?category=Aftermarket"
          className="inline-flex items-center gap-2 rounded-md bg-yellow-500 hover:bg-yellow-600 text-black font-semibold px-5 py-2.5"
        >
          <Filter className="h-4 w-4" aria-hidden />
          Start filtering aftermarket parts
        </Link>
      </div>
    </section>
  );
}
