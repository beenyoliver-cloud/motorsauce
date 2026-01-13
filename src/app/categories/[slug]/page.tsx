import Link from "next/link";
import { notFound } from "next/navigation";
import FeaturedRow from "@/components/home/FeaturedRow";

type CategoryMeta = {
  title: string;
  blurb: string;
  search: {
    category?: "oem" | "aftermarket" | "tools";
    q?: string;
  };
  chips?: Array<{ label: string; href: string }>;
  howto?: string[];
  preview?: {
    title: string;
    variant: "under20" | "under250" | "new";
  };
};

const META: Record<string, CategoryMeta> = {
  oem: {
    title: "OEM Parts",
    blurb: "Original equipment parts verified by the community. Filter by make, model, generation and OEM codes.",
    search: { category: "oem" },
    chips: [
      { label: "OEM filters", href: "/search?category=oem" },
      { label: "Part number", href: "/search?category=oem&q=oem%20" },
      { label: "Brake pads", href: "/search?category=oem&q=brake%20pads" },
      { label: "Service parts", href: "/search?category=oem&q=service" },
    ],
    howto: [
      "Search by the exact part name or OEM code.",
      "Add your make/model (or use registration search) to reduce mismatches.",
      "Check condition and photos before checkout.",
    ],
    preview: { title: "New OEM listings", variant: "new" },
  },
  aftermarket: {
    title: "Aftermarket Parts",
    blurb: "Quality aftermarket upgrades and replacements for your build.",
    search: { category: "aftermarket" },
    chips: [
      { label: "All aftermarket", href: "/search?category=aftermarket" },
      { label: "Coilovers", href: "/search?category=aftermarket&q=coilovers" },
      { label: "Exhaust", href: "/search?category=aftermarket&q=exhaust" },
      { label: "Intake", href: "/search?category=aftermarket&q=intake" },
    ],
    howto: [
      "Start with the part type, then filter by your car.",
      "Look for fitment notes in the description.",
      "Message the seller if you're unsure about compatibility.",
    ],
    preview: { title: "New aftermarket listings", variant: "new" },
  },
  tools: {
    title: "Tools & Accessories",
    blurb: "Everything from torque wrenches to diagnostic tools.",
    search: { category: "tools" },
    chips: [
      { label: "All tools", href: "/search?category=tools" },
      { label: "Torque wrench", href: "/search?category=tools&q=torque%20wrench" },
      { label: "Jack", href: "/search?category=tools&q=jack" },
      { label: "Diagnostics", href: "/search?category=tools&q=OBD" },
    ],
    howto: [
      "Search the tool name, brand, or size.",
      "Check condition and included accessories.",
      "Compare listings by delivery cost/time.",
    ],
    preview: { title: "Tools under £20", variant: "under20" },
  },
  compatibility: {
    title: "Compatibility Search",
    blurb: "Dial in exact-fit parts by make, model, generation, engine and year.",
    search: {},
    chips: [
      { label: "Use registration", href: "/" },
      { label: "Brakes", href: "/search?q=brake" },
      { label: "Suspension", href: "/search?q=coilover" },
      { label: "Exhaust", href: "/search?q=exhaust" },
    ],
    howto: [
      "Use registration search on the homepage for the quickest match.",
      "Or use Search filters for make, model, and year.",
      "Double-check fitment in the listing description.",
    ],
    preview: { title: "New listings", variant: "new" },
  },
  vin: {
    title: "VIN Lookup",
    blurb: "Use VINs alongside our filters to avoid guesswork (MVP: use Search + OEM code filters).",
    search: {},
    chips: [
      { label: "Search OEM", href: "/search?category=oem" },
      { label: "Part number", href: "/search?q=oem%20" },
      { label: "Service parts", href: "/search?q=service" },
    ],
    howto: [
      "Copy the OEM part number from your VIN decoder.",
      "Search the part number on Motorsource.",
      "Filter by your make/model/year if needed.",
    ],
    preview: { title: "New OEM listings", variant: "new" },
  },
};

function buildSearchHref(meta: CategoryMeta): string {
  const params = new URLSearchParams();
  if (meta.search.category) params.set("category", meta.search.category);
  if (meta.search.q) params.set("q", meta.search.q);
  const qs = params.toString();
  return `/search${qs ? `?${qs}` : ""}`;
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const key = slug.toLowerCase();
  const data = META[key];
  if (!data) return notFound();

  return (
    <section className="max-w-6xl mx-auto">
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6 md:p-8">
        <div className="text-sm text-gray-600">
          <Link href="/" className="hover:text-yellow-600">Home</Link>
          <span className="mx-2">/</span>
          <span className="text-gray-800">{data.title}</span>
        </div>

        <h1 className="mt-3 text-3xl font-bold text-black">{data.title}</h1>
        <p className="mt-2 text-gray-700">{data.blurb}</p>

        <div className="mt-5 flex flex-col sm:flex-row sm:items-center gap-3">
          <Link
            href={buildSearchHref(data)}
            className="inline-flex items-center justify-center px-4 py-2 rounded-md bg-yellow-500 text-black font-semibold hover:bg-yellow-600"
          >
            Browse listings
          </Link>
          <div className="text-sm text-gray-600">Tip: use registration search on the homepage for the fastest match.</div>
        </div>

        {data.chips && data.chips.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2">
            {data.chips.map((c) => (
              <Link
                key={c.href}
                href={c.href}
                className="inline-flex items-center rounded-full bg-gray-100 text-gray-800 border border-gray-200 px-3 py-1 text-xs hover:bg-yellow-50 hover:border-yellow-300 hover:text-yellow-700 transition"
              >
                {c.label}
              </Link>
            ))}
          </div>
        )}

        {data.howto && data.howto.length > 0 && (
          <div className="mt-6 rounded-xl border border-gray-200 bg-white shadow-sm p-4">
            <div className="text-sm font-semibold text-black">How this works</div>
            <ul className="mt-2 text-sm text-gray-700 space-y-1 list-disc pl-5">
              {data.howto.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {data.preview && (
        <div className="mt-6">
          {/* @ts-ignore Server -> Client import allowed */}
          <FeaturedRow title={data.preview.title} variant={data.preview.variant} />
        </div>
      )}
    </section>
  );
}
