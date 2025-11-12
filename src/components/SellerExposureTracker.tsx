"use client";

import { useEffect, useRef } from "react";

interface Props {
  sellerName?: string;
  avatar?: string;
  disable?: boolean; // e.g. viewing own listing
}

/**
 * Records a single seller exposure (a listing view) once per page load.
 * Debounced via sessionStorage so rapid navigations don't spam.
 */
export default function SellerExposureTracker({ sellerName, avatar, disable }: Props) {
  const sentRef = useRef(false);

  useEffect(() => {
    if (!sellerName || disable) return;
    if (sentRef.current) return;
    const key = `ms:exposed:${sellerName.toLowerCase()}`;
    // Avoid multiple sends in same tab within short interval (e.g. 5 min)
    const last = sessionStorage.getItem(key);
    const now = Date.now();
    if (last && now - Number(last) < 5 * 60 * 1000) return; // 5 minute cooldown per seller

    sentRef.current = true;
    sessionStorage.setItem(key, String(now));
    fetch("/api/track-seller", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: sellerName, avatar }),
    }).catch(() => {/* ignore */});
  }, [sellerName, avatar, disable]);

  return null;
}
