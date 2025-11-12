"use client";

import { useEffect, useMemo, useState } from "react";
import { getCurrentUser } from "@/lib/auth";

/**
 * Counts listings for a profile by:
 *  1) Matching listing.seller_id with the profile's user ID
 *  2) Uses Supabase auth to get current user
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

    (async () => {
      try {
          // Get current user from Supabase
          const currentUser = await getCurrentUser();
        
        // Try the API (no-store so it reflects current mock DB)
        const r = await fetch("/api/listings", { cache: "no-store" });
        if (!r.ok) throw new Error("Failed to load listings");
        const raw = (await r.json()) as unknown;
        const all: unknown[] = Array.isArray(raw) ? (raw as unknown[]) : [];

        const ids = new Set<string>();

        for (const rec of all ?? []) {
          const l = (rec && typeof rec === "object" ? rec : {}) as Record<string, unknown>;
          const sellerObj = (l.seller && typeof l.seller === "object" ? (l.seller as Record<string, unknown>) : null);
          const seller = normaliseName(sellerObj?.name);
          if (seller && seller === key && l?.id != null) ids.add(String(l.id as string | number));
        }

          // If this is the *current* user's profile, include their user ID items too
          if (currentUser && normaliseName(currentUser.name) === key) {
      for (const rec of all ?? []) {
        const l = (rec && typeof rec === "object" ? rec : {}) as Record<string, unknown>;
        if (l?.seller_id === currentUser.id && l?.id != null) ids.add(String(l.id as string | number));
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
