// src/components/SellerLink.tsx
"use client";

import Link from "next/link";
import { getCurrentUserSync } from "@/lib/auth";
import React from "react";

type Props = {
  sellerName: string;
  sellerId?: string;
  className?: string;
  children?: React.ReactNode;
};

export default function SellerLink({ sellerName, sellerId, className, children }: Props) {
  const selfName = getCurrentUserSync()?.name?.trim() || "";
  const isSelf = selfName && selfName.toLowerCase() === sellerName.trim().toLowerCase();

  // Always use username route - never expose UUIDs in URLs for security
  const href = `/profile/${encodeURIComponent(sellerName)}`;

  return (
    <Link
      href={href}
      className={className}
      aria-label={isSelf ? "Go to your profile" : `View ${sellerName}'s profile`}
      onClick={() => {
        try {
          const payload = JSON.stringify({ name: sellerName });
          if (navigator.sendBeacon) {
            const blob = new Blob([payload], { type: 'application/json' });
            navigator.sendBeacon('/api/track-seller', blob);
          } else {
            fetch('/api/track-seller', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload, keepalive: true }).catch(() => {});
          }
        } catch {}
      }}
    >
      {children ?? sellerName}
    </Link>
  );
}
