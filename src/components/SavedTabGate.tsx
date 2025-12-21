"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { getCurrentUserSync, isMe } from "@/lib/auth";
import MySavedTab from "@/components/MySavedTab";
import { loadMyCars } from "@/lib/garage";

/** Simple tab link */
function TabLink({ href, label, isActive }: { href: string; label: string; isActive: boolean }) {
  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={`group relative inline-flex min-w-[140px] items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 ${
        isActive
          ? "border-transparent bg-gradient-to-r from-yellow-500 via-yellow-600 to-gray-900 text-white shadow-lg"
          : "border-gray-200 bg-white/90 text-gray-700 hover:border-yellow-400 hover:text-gray-900"
      }`}
    >
      <span className="truncate">{label}</span>
      {isActive && (
        <span className="text-[10px] font-normal uppercase tracking-[0.3em] text-white/80">Live</span>
      )}
    </Link>
  );
}

export default function SavedTabGate({
  sellerName,
  baseHref,
  activeTab,
  isBusinessAccount,
}: {
  sellerName: string;
  baseHref: string;
  activeTab: "saved" | "my" | "drafts" | "sold" | "about" | "reviews" | "garage";
  isBusinessAccount?: boolean;
}) {
  const [me, setMe] = useState(false);
  const [garageCount, setGarageCount] = useState(0);
  const [draftCount, setDraftCount] = useState(0);
  const [soldCount, setSoldCount] = useState(0);

  useEffect(() => {
    isMe(sellerName).then(setMe);
    const currentUser = getCurrentUserSync();
    
    // Load garage count if not business
    if (!isBusinessAccount) {
      try {
        const cars = loadMyCars();
        setGarageCount(cars.length);
      } catch {
        setGarageCount(0);
      }
    }

    // Load draft count and sold count if owner
    if (currentUser?.id) {
      loadDraftCount(currentUser.id);
      loadSoldCount(currentUser.id);
    }
  }, [sellerName, isBusinessAccount]);

  async function loadDraftCount(userId: string) {
    try {
      const { supabaseBrowser } = await import("@/lib/supabase");
      const supabase = supabaseBrowser();
      const { count } = await supabase
        .from("listings")
        .select("*", { count: "exact", head: true })
        .eq("seller_id", userId)
        .eq("status", "draft");
      setDraftCount(count || 0);
    } catch {
      setDraftCount(0);
    }
  }

  async function loadSoldCount(userId: string) {
    try {
      const { supabaseBrowser } = await import("@/lib/supabase");
      const supabase = supabaseBrowser();
      const { count } = await supabase
        .from("listings")
        .select("*", { count: "exact", head: true })
        .eq("seller_id", userId)
        .eq("status", "sold");
      setSoldCount(count || 0);
    } catch {
      setSoldCount(0);
    }
  }

  const listingsLabel = useMemo(
    () => (me ? "My Listings" : `${sellerName}'s listings`),
    [me, sellerName]
  );

  return (
    <>
      <div className="mt-6 rounded-3xl border border-gray-200 bg-white/80 backdrop-blur px-3 py-3">
        <div className="flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible scrollbar-hide">
          {me && <TabLink href={`${baseHref}?tab=saved`} label="Saved" isActive={activeTab === "saved"} />}
          <TabLink href={`${baseHref}?tab=my`} label={listingsLabel} isActive={activeTab === "my"} />
          {me && (
            <TabLink
              href={`${baseHref}?tab=drafts`}
              label={`Drafts${draftCount > 0 ? ` (${draftCount})` : ""}`}
              isActive={activeTab === "drafts"}
            />
          )}
          {me && (
            <TabLink
              href={`${baseHref}?tab=sold`}
              label={`Sold${soldCount > 0 ? ` (${soldCount})` : ""}`}
              isActive={activeTab === "sold"}
            />
          )}
          <TabLink href={`${baseHref}?tab=about`} label="About" isActive={activeTab === "about"} />
          <TabLink href={`${baseHref}?tab=reviews`} label="Reviews (0)" isActive={activeTab === "reviews"} />
          {!isBusinessAccount && (
            <TabLink
              href={`${baseHref}?tab=garage`}
              label={`Garage${garageCount > 0 ? ` (${garageCount})` : ""}`}
              isActive={activeTab === "garage"}
            />
          )}
        </div>
      </div>

      {activeTab === "saved" && (
        <div className="mt-4">
          {me ? (
            <MySavedTab />
          ) : (
            <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-700">
              Saved items are private to you.{" "}
              <Link href="/auth/login" className="text-yellow-600 hover:underline">
                Sign in
              </Link>{" "}
              to view your saved items.
            </div>
          )}
        </div>
      )}
    </>
  );
}
