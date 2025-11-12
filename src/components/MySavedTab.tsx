"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import SafeImage from "@/components/SafeImage";
import { getCurrentUserSync, nsKey } from "@/lib/auth";

type Listing = {
  id: string; title: string; price: string; image: string; images?: string[];
  category: "OEM" | "Aftermarket" | "Tool";
};

export default function MySavedTab() {
  const [ids, setIds] = useState<string[]>([]);
  const [all, setAll] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const u = getCurrentUserSync();
    if (!u) {
      setIds([]);
      setLoading(false);
      return;
    }
    try {
      const raw = localStorage.getItem(nsKey("favs_v1"));
      const arr = raw ? JSON.parse(raw) : [];
      setIds(Array.isArray(arr) ? arr.map(String) : []);
    } catch {
      setIds([]);
    }

    fetch("/api/listings", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => setAll(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));

    const sync = () => {
      try {
        const raw = localStorage.getItem(nsKey("favs_v1"));
        const arr = raw ? JSON.parse(raw) : [];
        setIds(Array.isArray(arr) ? arr.map(String) : []);
      } catch {}
    };
    window.addEventListener("favorites-changed", sync as EventListener);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("favorites-changed", sync as EventListener);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const savedListings = useMemo(() => {
    const set = new Set(ids);
    return all.filter((l) => set.has(String(l.id)));
  }, [ids, all]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="animate-pulse border border-gray-200 rounded-xl overflow-hidden">
            <div className="aspect-[4/3] bg-gray-100" />
            <div className="p-3 space-y-2">
              <div className="h-4 bg-gray-100 rounded" />
              <div className="h-3 bg-gray-100 rounded w-2/3" />
              <div className="h-5 bg-gray-100 rounded w-1/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!getCurrentUserSync()) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-700">
        Saved items are private to your account.{" "}
        <Link href="/auth/login" className="text-yellow-600 hover:underline">Sign in</Link> to view them.
      </div>
    );
  }

  if (savedListings.length === 0) {
    return <div className="rounded-xl border border-dashed border-gray-300 p-10 text-center text-gray-600">You haven’t saved anything yet.</div>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
      {savedListings.map((l) => (
        <Link key={l.id} href={`/listing/${l.id}`} className="block border border-gray-200 rounded-xl overflow-hidden bg-white hover:shadow-lg hover:-translate-y-0.5 transition">
          <div className="relative aspect-[4/3] bg-gray-50">
            <span className="absolute top-2 left-2 text-[10px] px-2 py-0.5 rounded bg-yellow-500 text-black">Saved</span>
            <SafeImage src={l.image} alt={l.title} className="absolute inset-0 w-full h-full object-cover" />
          </div>
          <div className="p-3">
            <h3 className="text-sm font-semibold text-gray-900 line-clamp-2">{l.title}</h3>
            <div className="mt-1 text-base font-bold text-gray-900">{l.price}</div>
          </div>
        </Link>
      ))}
    </div>
  );
}
