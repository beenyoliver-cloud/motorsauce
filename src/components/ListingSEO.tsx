// src/components/ListingSEO.tsx
import React from "react";

type Props = {
  id: string | number;
  title: string;
  description?: string;
  /** Numeric price in GBP, e.g. 129.99 */
  priceGBP: number;
  /** Absolute or site-relative URL to the primary image */
  image: string;
  brand?: string;
  condition?: "New" | "Used - Like New" | "Used - Good" | "Used - Fair";
  /** OEM / MPN code, if applicable */
  oem?: string;
  /** Optional canonical URL (if you have it handy) */
  url?: string;
};

function conditionToSchema(cond?: Props["condition"]) {
  if (!cond) return undefined;
  // Schema.org has only broad conditions; map all “Used” to UsedCondition
  return cond === "New" ? "https://schema.org/NewCondition" : "https://schema.org/UsedCondition";
}

export default function ListingSEO({
  id,
  title,
  description = "",
  priceGBP,
  image,
  brand,
  condition,
  oem,
  url,
}: Props) {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://example.com").replace(/\/$/, "");
  const safePrice = Number.isFinite(priceGBP) ? priceGBP : 0;

  const data = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": url || `${siteUrl}/listing/${encodeURIComponent(String(id))}`,
    name: title,
    description,
    image,
    brand: brand ? { "@type": "Brand", name: brand } : undefined,
    mpn: oem || undefined,
    offers: {
      "@type": "Offer",
      priceCurrency: "GBP",
      price: safePrice.toFixed(2),
      availability: "https://schema.org/InStock",
      url: url || `${siteUrl}/listing/${encodeURIComponent(String(id))}`,
    },
    itemCondition: conditionToSchema(condition),
  };

  return (
    <script
      type="application/ld+json"
      // JSON-LD must be raw JSON inside the script tag
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
