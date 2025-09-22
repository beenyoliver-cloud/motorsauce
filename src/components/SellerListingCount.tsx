"use client";

import { useEffect, useMemo, useState } from "react";

/**
 * Counts listings for a profile by:
 *  1) Matching listing.seller.name (case/spacing-insensitive) with sellerName
 *  2) If viewing *your* profile (sellerName === local ms_user_name), also include listings where ownerId === ms_user_id
 *
 * It fetches from /api/listings (your mock API).
 */
export default function SellerListingCount({
  sellerName,
  className = "text-lg font-semibold text-yellow-600 tabular-nums",
}: {
  sellerName: string;
  className?: string;
}) {
  const [count, setCount] = useState<number | null>(null);

  // normalise names to avoid space/case/hyphen mismatches
  const key = useMemo(() => normaliseName(sellerName), [sellerName]);

  useEffect(() => {
    let alive = true;

    // Ensure local identity (same logic your Sell/MyListings uses)
    let uid = localStorage.getItem("ms_user_id");
    let uname = localStorage.getItem("ms_user_name");
    if (!uid) {
      uid = `user_${crypto.randomUUID()}`;
      localStorage.setItem("ms_user_id", uid);
    }
    if (!uname) {
      uname = "You";
      localStorage.setItem("ms_user_name", uname);
    }

    (async () => {
      try {
        // Try the API (no-store so it reflects current mock DB)
        const r = await fetch("/api/listings", { cache: "no-store" });
        if (!r.ok) throw new Error("Failed to load listings");
        const all = (await r.json()) as any[];

        const ids = new Set<string>();

        for (const l of all ?? []) {
          const seller = normaliseName(l?.seller?.name);
          if (seller && seller === key && l?.id) ids.add(String(l.id));
        }

        // If this is the *current* user's profile, include their ownerId items too
        if (uname && normaliseName(uname) === key && uid) {
          for (const l of all ?? []) {
            if (l?.ownerId === uid && l?.id) ids.add(String(l.id));
          }
        }

        if (alive) setCount(ids.size);
      } catch {
        if (alive) setCount(0);
      }
    })();

    return () => {
      alive = false;
    };
  }, [key]);

  return <span className={className}>{count === null ? "—" : count}</span>;
}

function normaliseName(v: unknown) {
  return String(v ?? "")
    .trim()
    .toLowerCase()
    .replace(/[-_]+/g, " ") // treat hyphens/underscores as spaces
    .replace(/\s+/g, " ");
}
