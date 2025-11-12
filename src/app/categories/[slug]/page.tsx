import Link from "next/link";
import { notFound } from "next/navigation";

const META: Record<string, { title: string; blurb: string; cta: { href: string; label: string } }> = {
  oem: {
    title: "OEM Parts",
    blurb: "Original equipment parts verified by the community. Filter by make, model, generation and OEM codes.",
    cta: { href: "/search?category=OEM", label: "Browse OEM" },
  },
  aftermarket: {
    title: "Aftermarket Parts",
    blurb: "Quality aftermarket upgrades and replacements for your build.",
    cta: { href: "/search?category=Aftermarket", label: "Browse Aftermarket" },
  },
  tools: {
    title: "Tools & Accessories",
    blurb: "Everything from torque wrenches to diagnostic tools.",
    cta: { href: "/search?category=Tool", label: "Browse Tools" },
  },
  compatibility: {
    title: "Compatibility Search",
    blurb: "Dial in exact-fit parts by make, model, generation, engine and year.",
    cta: { href: "/search", label: "Open Search" },
  },
  vin: {
    title: "VIN Lookup",
    blurb: "Use VINs alongside our filters to avoid guesswork (MVP: use Search + OEM code filters).",
    cta: { href: "/search", label: "Open Search" },
  },
};

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const key = slug.toLowerCase();
  const data = META[key];
  if (!data) return notFound();

  return (
    <section className="max-w-5xl mx-auto">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 md:p-8">
        <h1 className="text-3xl font-bold text-black">{data.title}</h1>
        <p className="mt-2 text-gray-700">{data.blurb}</p>

        <div className="mt-5">
          <Link
            href={data.cta.href}
            className="inline-block px-4 py-2 rounded-md bg-yellow-500 text-black font-semibold hover:bg-yellow-600"
          >
            {data.cta.label}
          </Link>
        </div>
      </div>

      <div className="mt-8 text-sm text-gray-600">
        <Link href="/" className="hover:text-yellow-600">Home</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-800">{data.title}</span>
      </div>
    </section>
  );
}
