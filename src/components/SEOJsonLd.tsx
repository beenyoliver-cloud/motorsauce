"use client";

import React from "react";

export default function SEOJsonLd() {
  const json = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Motorsource",
    url: "https://motorsauce.vercel.app/",
    potentialAction: {
      "@type": "SearchAction",
      target: "https://motorsauce.vercel.app/search?q={search_term_string}",
      "query-input": "required name=search_term_string",
    },
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  );
}
