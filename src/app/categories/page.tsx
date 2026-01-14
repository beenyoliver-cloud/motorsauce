import Link from "next/link";
import { getMainCategories, getSubcategoriesForMain, type MainCategory } from "@/data/partCategories";

const FEATURED_CATEGORIES = [
  {
    title: "OEM Parts",
    description: "Original equipment parts verified by the community.",
    href: "/categories/oem",
    cta: "Browse OEM",
  },
  {
    title: "Aftermarket Parts",
    description: "Upgrades and replacements for every build.",
    href: "/categories/aftermarket",
    cta: "Browse aftermarket",
  },
  {
    title: "Tools & Accessories",
    description: "Garage gear, diagnostics, and workshop essentials.",
    href: "/categories/tools",
    cta: "Browse tools",
  },
  {
    title: "Compatibility Search",
    description: "Use registration search to match parts fast.",
    href: "/categories/compatibility",
    cta: "Use compatibility",
  },
  {
    title: "VIN Lookup",
    description: "Use OEM codes and VIN guidance to avoid guesswork.",
    href: "/categories/vin",
    cta: "Use VIN lookup",
  },
  {
    title: "Service Parts",
    description: "Filters, fluids, and essential maintenance parts.",
    href: "/search?q=service%20parts",
    cta: "Browse service parts",
  },
];

function orderCategories(categories: MainCategory[]) {
  const preferred = categories.filter((cat) => cat !== "Other");
  const other = categories.filter((cat) => cat === "Other");
  return [...preferred, ...other];
}

export default function CategoriesPage() {
  const categories = orderCategories(getMainCategories());

  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6 sm:p-8">
        <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.3em] text-gray-500 font-semibold">
          Categories
        </p>
        <h1 className="mt-2 text-3xl sm:text-4xl font-bold text-gray-900">
          Browse parts by category
        </h1>
        <p className="mt-2 text-sm sm:text-base text-gray-600 max-w-2xl">
          Start with your vehicle or jump straight to a category. Every listing is backed by
          buyer protection and verified seller controls.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:border-yellow-400 hover:text-yellow-700 transition"
          >
            Search by registration
          </Link>
          <Link
            href="/search"
            className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:border-yellow-400 hover:text-yellow-700 transition"
          >
            Browse all listings
          </Link>
          <Link
            href="/saved-searches"
            className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:border-yellow-400 hover:text-yellow-700 transition"
          >
            Get notified on new matches
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {FEATURED_CATEGORIES.map((item) => (
          <Link
            key={item.title}
            href={item.href}
            className="group rounded-xl border border-gray-200 bg-white shadow-sm p-5 hover:border-yellow-400 hover:shadow-md transition"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{item.title}</h2>
                <p className="mt-1 text-sm text-gray-600">{item.description}</p>
              </div>
              <span className="text-xs font-semibold text-gray-500 group-hover:text-yellow-700 transition">
                {item.cta} ->
              </span>
            </div>
          </Link>
        ))}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.2em] text-gray-500 font-semibold">
              All categories
            </p>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Find the exact part type</h2>
          </div>
          <span className="text-xs text-gray-500">{categories.length} main categories</span>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((category) => {
            const subcategories = getSubcategoriesForMain(category);
            const preview = subcategories.slice(0, 4);
            return (
              <Link
                key={category}
                href={`/search?q=${encodeURIComponent(category)}`}
                className="group rounded-xl border border-gray-200 bg-white p-4 hover:border-yellow-400 hover:shadow-md transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">{category}</h3>
                    <p className="mt-1 text-xs text-gray-500">{subcategories.length} subcategories</p>
                  </div>
                  <span className="text-xs font-semibold text-gray-500 group-hover:text-yellow-700 transition">
                    Browse ->
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {preview.map((sub) => (
                    <span
                      key={sub}
                      className="rounded-full border border-gray-200 bg-gray-50 px-2 py-1 text-[11px] text-gray-700"
                    >
                      {sub}
                    </span>
                  ))}
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6 sm:p-8">
        <h2 className="text-xl font-bold text-gray-900">Notify me when a part is available</h2>
        <p className="mt-2 text-sm text-gray-600 max-w-2xl">
          Save your filters and get alerts when matching parts land on Motorsource. You can
          manage alerts any time from your saved searches.
        </p>
        <Link
          href="/search"
          className="mt-4 inline-flex items-center justify-center rounded-lg bg-yellow-500 px-4 py-2 text-sm font-semibold text-black hover:bg-yellow-600 transition"
        >
          Start a search and set alerts
        </Link>
      </div>
    </section>
  );
}
