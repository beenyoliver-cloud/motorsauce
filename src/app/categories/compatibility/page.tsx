// DB-only compatibility page (no mocks, no "@/listings")
import Link from "next/link";

export const dynamic = "force-dynamic";

type Listing = {
  id: string;
  title: string;
  price: string;
  image: string;
  category: string;
  seller: { name: string; avatar: string; rating: number };
};

async function getAllListings(): Promise<Listing[]> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "";
  const res = await fetch(`${base}/api/listings`, { cache: "no-store" });
  if (!res.ok) return [];
  return res.json();
}

export default async function CompatibilityPage({
  searchParams,
}: { searchParams?: { q?: string } }) {
  const q = (searchParams?.q || "").toLowerCase().trim();
  const items = await getAllListings();
  const filtered = q
    ? items.filter((l) =>
        [l.title, l.category, l.seller?.name]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q))
      )
    : items;

  return (
    <main className="px-6 sm:px-8 md:px-12 py-12">
      <h1 className="text-2xl font-bold mb-2">Compatibility search</h1>
      <p className="text-gray-600 mb-6">
        Type a make/model/keyword to filter listings from the database.
      </p>

      {/* simple search form */}
      <form className="mb-6" action="/categories/compatibility">
        <input
          name="q"
          defaultValue={q}
          placeholder="e.g. BMW M3 2003"
          className="w-full max-w-xl border border-gray-300 rounded-md px-3 py-2"
        />
      </form>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-10 text-center">
          <div className="text-gray-700">
            No matches. <Link href="/" className="text-yellow-600 underline">Browse all listings</Link>.
          </div>
        </div>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          {filtered.map((l) => (
            <li key={l.id} className="border border-gray-200 rounded-lg overflow-hidden bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={l.image} alt={l.title} className="w-full h-44 object-cover" />
              <div className="p-3">
                <div className="text-xs font-bold mb-1">{l.category}</div>
                <h3 className="text-lg font-semibold line-clamp-2">{l.title}</h3>
                <p className="mt-1 text-yellow-500 font-bold">{l.price}</p>
                <div className="flex items-center mt-2 text-sm text-gray-700">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={l.seller?.avatar} alt={l.seller?.name} className="h-6 w-6 rounded-full mr-2 object-cover" />
                  {l.seller?.name} • ⭐ {Number(l.seller?.rating ?? 5).toFixed(1)}
                </div>
              </div>
              <a href={`/listing/${l.id}`} className="absolute inset-0" aria-label={l.title}></a>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
