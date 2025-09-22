"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { getCurrentUser, isMe } from "@/lib/auth";
import MySavedTab from "@/components/MySavedTab";

/** Simple tab link */
function TabLink({ href, label, isActive }: { href: string; label: string; isActive: boolean }) {
  return (
    <Link
      href={href}
      className={`px-4 py-2 text-sm rounded-full border transition ${
        isActive
          ? "bg-yellow-500 text-black border-yellow-500"
          : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
      }`}
    >
      {label}
    </Link>
  );
}

export default function SavedTabGate({
  sellerName,
  baseHref,
  activeTab,
}: {
  sellerName: string;
  baseHref: string;
  activeTab: "saved" | "my" | "about" | "reviews";
}) {
  const [me, setMe] = useState(false);

  useEffect(() => {
    setMe(isMe(sellerName));
    getCurrentUser() ?? null;
  }, [sellerName]);

  const listingsLabel = useMemo(
    () => (me ? "My Listings" : `${sellerName}'s listings`),
    [me, sellerName]
  );

  return (
    <>
      {/* Tabs row */}
      <div className="mt-6 flex flex-wrap gap-2">
        {me && <TabLink href={`${baseHref}?tab=saved`} label="Saved" isActive={activeTab === "saved"} />}
        <TabLink href={`${baseHref}?tab=my`} label={listingsLabel} isActive={activeTab === "my"} />
        <TabLink href={`${baseHref}?tab=about`} label="About" isActive={activeTab === "about"} />
        <TabLink href={`${baseHref}?tab=reviews`} label="Reviews (0)" isActive={activeTab === "reviews"} />
      </div>

      {/* Saved content (gated) */}
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
