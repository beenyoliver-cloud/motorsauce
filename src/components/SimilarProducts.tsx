// src/components/SimilarProducts.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import SafeImage from "./SafeImage";

type SimilarProduct = {
  id: string | number;
  title: string;
  price: string;
  image: string;
  category: string;
  make?: string;
  model?: string;
  condition: string;
};

type SimilarProductsProps = {
  listingId: string | number;
  limit?: number;
};

export default function SimilarProducts({ listingId, limit = 6 }: SimilarProductsProps) {
  const [products, setProducts] = useState<SimilarProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSimilar() {
      try {
        const res = await fetch(`/api/listings/similar?id=${encodeURIComponent(String(listingId))}&limit=${limit}`);
        if (res.ok) {
          const data = await res.json();
          setProducts(data.similar || []);
        }
      } catch (error) {
        console.error("[SimilarProducts] Error fetching similar products:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchSimilar();
  }, [listingId, limit]);

  if (loading) {
    return (
      <section className="mt-8 border-t border-gray-200 pt-6">
        <h2 className="mb-4 text-xl font-bold text-black">Related parts</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: limit }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-square rounded-lg bg-gray-200" />
              <div className="mt-2 h-4 rounded bg-gray-200" />
              <div className="mt-1 h-3 w-16 rounded bg-gray-100" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (products.length === 0) {
    return null;
  }

  return (
    <section className="mt-8 border-t border-gray-200 pt-6">
      <h2 className="mb-4 text-xl font-bold text-black">Related parts</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {products.map((product) => (
          <Link
            key={product.id}
            href={`/listing/${product.id}`}
            data-listing-card={String(product.id)}
            className="group block overflow-hidden rounded-lg border border-gray-200 bg-white transition hover:shadow-md"
          >
            <div className="aspect-square overflow-hidden bg-gray-50">
              <SafeImage
                src={product.image}
                alt={product.title}
                className="h-full w-full object-contain transition group-hover:scale-105"
                loading="lazy"
              />
            </div>
            <div className="p-3">
              <h3 className="text-sm font-medium text-gray-900 line-clamp-2 group-hover:text-black">
                {product.title}
              </h3>
              <div className="mt-1 flex items-center justify-between gap-2">
                <p className="text-sm font-bold text-black">{product.price}</p>
                {product.condition && (
                  <span className="text-xs text-gray-500">{product.condition}</span>
                )}
              </div>
              {(product.make || product.model) && (
                <p className="mt-1 text-xs text-gray-600 line-clamp-1">
                  {[product.make, product.model].filter(Boolean).join(" ")}
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
