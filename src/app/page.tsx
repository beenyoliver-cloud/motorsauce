import Link from "next/link";
import { getAllListings } from "@/listings";
export const dynamic = "force-static";

export default async function Home() {
  const items = await getAllListings();
  return (
    <main className="px-6 sm:px-8 md:px-12 py-12">
      <h1 className="text-2xl font-bold mb-6">Recent Listings</h1>
      <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
        {items.map((l) => (
          <li key={l.id} className="border border-gray-200 rounded-lg overflow-hidden bg-white relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={l.image} alt={l.title} className="w-full h-44 object-cover" />
            <div className="p-3">
              <div className="text-xs font-bold mb-1">{l.category}</div>
              <h3 className="text-lg font-semibold line-clamp-2">{l.title}</h3>
              <p className="mt-1 text-yellow-500 font-bold">{l.price}</p>
              <div className="text-sm text-gray-700 mt-1">{l.seller.name} • ⭐ {l.seller.rating.toFixed(1)}</div>
            </div>
            <Link href={`/listing/${l.id}`} className="absolute inset-0" aria-label={l.title}></Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
