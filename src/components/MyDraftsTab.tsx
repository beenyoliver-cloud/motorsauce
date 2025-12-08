// src/components/MyDraftsTab.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getCurrentUserSync } from "@/lib/auth";
import SafeImage from "@/components/SafeImage";
import { AlertCircle, Edit } from "lucide-react";

type DraftListing = {
  id: string | number;
  title: string;
  price: string | number;
  image?: string;
  status?: string;
  draft_reason?: string;
  images?: string[];
};

export default function MyDraftsTab({ sellerName }: { sellerName: string }) {
  const [drafts, setDrafts] = useState<DraftListing[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadDrafts();
  }, [sellerName]);

  async function loadDrafts() {
    try {
      const user = getCurrentUserSync();
      if (!user?.id) {
        setLoading(false);
        return;
      }

      // Fetch draft listings
      const { supabaseBrowser } = await import("@/lib/supabase");
      const supabase = supabaseBrowser();
      
      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .eq("seller_id", user.id)
        .eq("status", "draft")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading drafts:", error);
        return;
      }

      const formatted = (data || []).map((item: any) => ({
        id: item.id,
        title: item.title || "Untitled",
        price: item.price ? `£${Number(item.price).toFixed(2)}` : "£0.00",
        image: Array.isArray(item.images) && item.images.length > 0 ? item.images[0] : undefined,
        status: item.status,
        draft_reason: item.draft_reason,
        images: item.images,
      }));

      setDrafts(formatted);
    } catch (err) {
      console.error("Failed to load drafts:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="py-12 text-center text-gray-500">
        Loading drafts...
      </div>
    );
  }

  if (drafts.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500 mb-4">No draft listings</p>
        <Link
          href="/sell"
          className="inline-block px-6 py-3 bg-yellow-500 hover:bg-yellow-600 text-black font-bold rounded-lg"
        >
          Create Listing
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-2 sm:grid sm:grid-cols-2 md:grid-cols-4 sm:gap-6 sm:space-y-0">
      {drafts.map((draft) => (
        <div
          key={String(draft.id)}
          className="group relative border border-yellow-200 rounded-lg overflow-hidden bg-yellow-50 hover:shadow-lg hover:-translate-y-0.5 transition"
        >
          {/* Draft badge */}
          <div className="absolute top-2 left-2 z-20 flex items-center gap-1 bg-yellow-500 text-black px-2 py-1 rounded-md text-xs font-bold">
            <AlertCircle className="h-3 w-3" />
            DRAFT
          </div>

          {/* Content - not clickable since it's a draft */}
          <div className="flex sm:block items-center gap-3 sm:gap-0">
            <div className="relative w-[120px] h-[120px] sm:w-auto sm:h-auto sm:aspect-[4/3] bg-gray-100 overflow-hidden shrink-0">
              {draft.image ? (
                <SafeImage src={draft.image} alt={draft.title} className="w-full h-full object-cover object-center opacity-60" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  No Image
                </div>
              )}
            </div>
            <div className="flex-1 p-2 sm:p-3 flex flex-col justify-between min-w-0">
              <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 pr-20 sm:pr-0">{draft.title}</h3>
              <div className="mt-1">
                <div className="text-base font-bold text-gray-900">{draft.price}</div>
              </div>
              {draft.draft_reason && (
                <div className="mt-2 text-xs text-yellow-800 bg-yellow-100 rounded px-2 py-1">
                  {draft.draft_reason}
                </div>
              )}
            </div>
          </div>

          {/* Edit button - positioned outside content to prevent overlap */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              e.nativeEvent.stopImmediatePropagation();
              router.push(`/listing/${draft.id}/edit`);
              return false;
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
            }}
            onTouchStart={(e) => {
              e.stopPropagation();
            }}
            className="absolute top-2 right-2 rounded-md bg-yellow-600 text-white px-3 py-1.5 text-xs font-semibold sm:opacity-0 sm:group-hover:opacity-100 sm:bg-black/70 transition z-30 hover:bg-yellow-700 sm:hover:bg-black flex items-center gap-1 shadow-sm pointer-events-auto"
          >
            <Edit className="h-3 w-3" />
            Edit
          </button>
        </div>
      ))}
    </div>
  );
}
