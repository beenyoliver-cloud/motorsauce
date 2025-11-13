// src/app/categories/oem/page.tsx
import Link from "next/link";
import {
  CheckCircle2,
  Wrench,
  Cog,
  Car,
  ShieldCheck,
  Gauge,
  Filter,
  Tag,
  Sparkles,
} from "lucide-react";

export const metadata = {
  title: "OEM Parts | Motorsource",
  description:
    "Shop OEM (Original Equipment Manufacturer) car parts by type, brand, and quick filters. Verified listings with OEM codes where available.",
};

const PART_TYPES: { label: string; icon: React.ElementType; href: string; blurb?: string }[] = [
  { label: "Body & Exterior", icon: ShieldCheck, href: "/search?category=OEM&section=Body" },
  { label: "Engine & Drivetrain", icon: Cog, href: "/search?category=OEM&section=Engine" },
  { label: "Brakes & Suspension", icon: Gauge, href: "/search?category=OEM&section=Brakes" },
  { label: "Interior & Trim", icon: Car, href: "/search?category=OEM&section=Interior" },
  { label: "Electrical & Sensors", icon: Sparkles, href: "/search?category=OEM&section=Electrical" },
  { label: "Service & Maintenance", icon: Wrench, href: "/search?category=OEM&section=Service" },
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
  { label: "New (unused)", href: "/search?category=OEM&condition=New", icon: Tag },
  { label: "Used (genuine)", href: "/search?category=OEM&condition=Used", icon: Tag },
  { label: "Under £50", href: "/search?category=OEM&maxPrice=50", icon: Filter },
  { label: "£50–£200", href: "/search?category=OEM&minPrice=50&maxPrice=200", icon: Filter },
  { label: "Over £200", href: "/search?category=OEM&minPrice=200", icon: Filter },
  { label: "With OEM code only", href: "/search?category=OEM&oemCode=true", icon: CheckCircle2 },
];

export default function OEMCategoryPage() {
  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
      {/* Breadcrumb */}
      <nav className="mb-4 text-sm text-gray-600">
        <Link href="/" className="hover:text-yellow-600">Home</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-800">OEM Parts</span>
      </nav>

      {/* Hero / Intro */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 md:p-8 shadow-sm">
        <h1 className="text-3xl md:text-4xl font-extrabold text-black tracking-tight">OEM Parts</h1>
        <p className="mt-2 text-gray-700 max-w-2xl">
          Original Equipment Manufacturer parts — the exact-fit components your car shipped with.
          Browse by part type, brand, or use quick filters to narrow down to verified OEM codes.
        </p>
        <div className="mt-5">
          <Link
            href="/search?category=OEM"
            className="inline-block rounded-md bg-yellow-500 hover:bg-yellow-600 text-black font-semibold px-4 py-2"
          >
            Browse all OEM parts
          </Link>
        </div>
      </div>

      {/* Shop by Part Type */}
      <section className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="text-xl md:text-2xl font-bold text-black">Shop by part type</h2>
          <Link href="/search?category=OEM" className="text-sm font-medium text-yellow-700 hover:text-yellow-800">
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

      {/* Shop by Brand */}
      <section className="mt-10">
        <h2 className="text-xl md:text-2xl font-bold text-black">Shop by make</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {POPULAR_MAKES.map((make) => (
            <Link
              key={make}
              href={`/search?category=OEM&make=${encodeURIComponent(make)}`}
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
            <ShieldCheck className="h-5 w-5 text-yellow-700" aria-hidden /> What counts as OEM?
          </h3>
          <ul className="mt-3 space-y-2 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-yellow-700" aria-hidden />
              Parts manufactured by (or for) the vehicle maker to their spec.
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-yellow-700" aria-hidden />
              Listings often include an OEM / part number — use it to confirm fitment.
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-yellow-700" aria-hidden />
              For best results, combine <em>make • model • year</em> with an OEM code.
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
              Prefer listings with clear photos of labels/castings and the OEM code.
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-yellow-700" aria-hidden />
              Check condition notes (new old stock vs used) and warranty/returns.
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-yellow-700" aria-hidden />
              Use the seller’s rating and reviews as a trust signal.
            </li>
          </ul>
        </div>
      </section>

      {/* Final CTA */}
      <div className="mt-10 flex justify-center">
        <Link
          href="/search?category=OEM"
          className="inline-flex items-center gap-2 rounded-md bg-yellow-500 hover:bg-yellow-600 text-black font-semibold px-5 py-2.5"
        >
          <Filter className="h-4 w-4" aria-hidden />
          Start filtering OEM parts
        </Link>
      </div>
    </section>
  );
}
