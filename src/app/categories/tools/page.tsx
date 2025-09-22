// src/app/categories/tools/page.tsx
import Link from "next/link";
import {
  Wrench,
  ToolCase,      // ✅ replace Tool -> ToolCase
  Car,
  Gauge,
  Battery,
  Lightbulb,
  ScanSearch,
  Filter,
  Tag,
  CheckCircle2,
  ShieldCheck,
  Hammer,
} from "lucide-react";

export const metadata = {
  title: "Tools & Accessories | Motorsauce",
  description:
    "Shop garage tools, diagnostics, detailing, and accessories by type, brand, or quick filters.",
};

type Tile = { label: string; icon: React.ElementType; href: string };

const PART_TYPES: Tile[] = [
  { label: "Hand Tools", icon: Wrench, href: "/search?category=Tools&section=Hand%20Tools" },
  { label: "Power Tools", icon: ToolCase, href: "/search?category=Tools&section=Power%20Tools" }, // ✅ updated
  { label: "Diagnostics & OBD", icon: ScanSearch, href: "/search?category=Tools&section=Diagnostics" },
  { label: "Battery & Chargers", icon: Battery, href: "/search?category=Tools&section=Battery" },
  { label: "Lighting", icon: Lightbulb, href: "/search?category=Tools&section=Lighting" },
  { label: "Workshop & Stands", icon: Gauge, href: "/search?category=Tools&section=Workshop" },
];

const BRANDS = [
  "Bosch", "Sealey", "Draper", "Halfords", "Autel", "Launch",
  "Milwaukee", "Makita", "Ryobi", "Ring", "Nilfisk", "Kärcher",
];

const QUICK_FILTERS: { label: string; href: string; icon?: React.ElementType }[] = [
  { label: "New in box", href: "/search?category=Tools&condition=New", icon: Tag },
  { label: "Used, great cond.", href: "/search?category=Tools&condition=Used", icon: Tag },
  { label: "Under £25", href: "/search?category=Tools&maxPrice=25", icon: Filter },
  { label: "£25–£100", href: "/search?category=Tools&minPrice=25&maxPrice=100", icon: Filter },
  { label: "£100+", href: "/search?category=Tools&minPrice=100", icon: Filter },
  { label: "OBD/Scan tools only", href: "/search?category=Tools&section=Diagnostics", icon: ScanSearch },
];

export default function ToolsAccessoriesPage() {
  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
      {/* Breadcrumb */}
      <nav className="mb-4 text-sm text-gray-600">
        <Link href="/" className="hover:text-yellow-600">Home</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-800">Tools & Accessories</span>
      </nav>

      {/* Hero */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 md:p-8 shadow-sm">
        <h1 className="text-3xl md:text-4xl font-extrabold text-black tracking-tight">
          Tools & Accessories
        </h1>
        <p className="mt-2 text-gray-700 max-w-2xl">
          From hand tools and workshop gear to OBD scanners and lighting—find the tools that keep
          your projects moving. Browse by type, brand, or use quick filters.
        </p>
        <div className="mt-5">
          <Link
            href="/search?category=Tools"
            className="inline-block rounded-md bg-yellow-500 hover:bg-yellow-600 text-black font-semibold px-4 py-2"
          >
            Browse all tools & accessories
          </Link>
        </div>
      </div>

      {/* Shop by Type */}
      <section className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="text-xl md:text-2xl font-bold text-black">Shop by type</h2>
          <Link href="/search?category=Tools" className="text-sm font-medium text-yellow-700 hover:text-yellow-800">
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
        <h2 className="text-xl md:text-2xl font-bold text-black">Shop by brand</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {BRANDS.map((b) => (
            <Link
              key={b}
              href={`/search?category=Tools&brand=${encodeURIComponent(b)}`}
              className="inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm text-black hover:border-yellow-300 hover:text-yellow-700"
            >
              {b}
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
            <ShieldCheck className="h-5 w-5 text-yellow-700" aria-hidden /> Safety first
          </h3>
          <ul className="mt-3 space-y-2 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-yellow-700" aria-hidden />
              Use axle stands / wheel chocks and follow torque specs where applicable.
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-yellow-700" aria-hidden />
              Wear eye/hand protection when cutting, grinding, or using chemicals.
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-yellow-700" aria-hidden />
              Check tool ratings (battery/amps/Nm) to match the job.
            </li>
          </ul>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-black flex items-center gap-2">
            <Hammer className="h-5 w-5 text-yellow-700" aria-hidden /> Buying tips
          </h3>
          <ul className="mt-3 space-y-2 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-yellow-700" aria-hidden />
              Prefer listings with full kits, chargers, and original cases when applicable.
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-yellow-700" aria-hidden />
              For diagnostics, look for supported protocols and update eligibility.
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-yellow-700" aria-hidden />
              Check warranty/returns and seller ratings to gauge reliability.
            </li>
          </ul>
        </div>
      </section>

      {/* Final CTA */}
      <div className="mt-10 flex justify-center">
        <Link
          href="/search?category=Tools"
          className="inline-flex items-center gap-2 rounded-md bg-yellow-500 hover:bg-yellow-600 text-black font-semibold px-5 py-2.5"
        >
          <Filter className="h-4 w-4" aria-hidden />
          Start filtering tools
        </Link>
      </div>
    </section>
  );
}
