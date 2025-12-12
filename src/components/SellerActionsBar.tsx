"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Pencil, CheckCircle2, RotateCcw, FileText, Trash2, Loader2 } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase";

type Props = {
  listingId: string | number;
  currentStatus?: "active" | "draft" | "sold";
};

export default function SellerActionsBar({ listingId, currentStatus = "active" }: Props) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const isSold = currentStatus === "sold";
  const isDraft = currentStatus === "draft";

  async function getAuthToken(): Promise<string | null> {
    const supabase = supabaseBrowser();
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  }

  async function handleMarkAsSold() {
    setLoading("sold");
    setError(null);

    try {
      const token = await getAuthToken();
      if (!token) {
        setError("You must be logged in");
        return;
      }

      const action = isSold ? "mark_active" : "mark_sold";
      const response = await fetch("/api/listings/mark-sold", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          listingId: String(listingId),
          action,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update listing");
      }

      router.refresh();
    } catch (err: any) {
      console.error("Error toggling sold status:", err);
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(null);
    }
  }

  async function handleMoveToDrafts() {
    if (!confirm("Move this listing to drafts? It will no longer be visible to buyers.")) return;
    
    setLoading("draft");
    setError(null);

    try {
      const token = await getAuthToken();
      if (!token) {
        setError("You must be logged in");
        return;
      }

      const supabase = supabaseBrowser();
      const { error: updateError } = await supabase
        .from("listings")
        .update({ status: "draft", draft_reason: "Moved to drafts by seller" })
        .eq("id", listingId);

      if (updateError) throw updateError;

      router.push("/profile");
    } catch (err: any) {
      console.error("Error moving to drafts:", err);
      setError(err.message || "Failed to move to drafts");
    } finally {
      setLoading(null);
    }
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this listing? This action cannot be undone.")) return;
    
    setLoading("delete");
    setError(null);

    try {
      const token = await getAuthToken();
      if (!token) {
        setError("You must be logged in");
        return;
      }

      const response = await fetch(`/api/listings/${listingId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete listing");
      }

      router.push("/profile");
    } catch (err: any) {
      console.error("Error deleting listing:", err);
      setError(err.message || "Failed to delete listing");
    } finally {
      setLoading(null);
    }
  }

  async function handleReactivate() {
    setLoading("reactivate");
    setError(null);

    try {
      const supabase = supabaseBrowser();
      const { error: updateError } = await supabase
        .from("listings")
        .update({ status: "active", draft_reason: null })
        .eq("id", listingId);

      if (updateError) throw updateError;

      router.refresh();
    } catch (err: any) {
      console.error("Error reactivating listing:", err);
      setError(err.message || "Failed to reactivate listing");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">🔧</span>
        <h2 className="text-sm font-bold text-blue-900">Your Listing</h2>
      </div>
      
      <div className="flex flex-wrap items-center gap-2">
        {/* Edit Button */}
        <Link
          href={`/listing/${listingId}/edit`}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
        >
          <Pencil className="h-4 w-4" />
          Edit
        </Link>

        {/* Mark as Sold / Mark as Available */}
        {!isDraft && (
          <button
            onClick={handleMarkAsSold}
            disabled={loading !== null}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${
              isSold
                ? "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                : "bg-green-600 text-white hover:bg-green-700"
            }`}
          >
            {loading === "sold" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isSold ? (
              <RotateCcw className="h-4 w-4" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            {loading === "sold" ? "Updating..." : isSold ? "Relist" : "Mark Sold"}
          </button>
        )}

        {/* Reactivate (for drafts) */}
        {isDraft && (
          <button
            onClick={handleReactivate}
            disabled={loading !== null}
            className="inline-flex items-center gap-2 rounded-lg bg-green-600 text-white px-4 py-2 text-sm font-medium hover:bg-green-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading === "reactivate" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            {loading === "reactivate" ? "Publishing..." : "Publish"}
          </button>
        )}

        {/* Move to Drafts (only for active listings) */}
        {currentStatus === "active" && (
          <button
            onClick={handleMoveToDrafts}
            disabled={loading !== null}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading === "draft" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
            {loading === "draft" ? "Moving..." : "Move to Drafts"}
          </button>
        )}

        {/* Delete */}
        <button
          onClick={handleDelete}
          disabled={loading !== null}
          className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 hover:border-red-300 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading === "delete" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
          {loading === "delete" ? "Deleting..." : "Delete"}
        </button>
      </div>

      {error && (
        <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          ⚠️ {error}
        </p>
      )}

      {/* Status indicator */}
      <div className="mt-3 text-xs text-blue-700">
        {isSold && "This listing is marked as sold and hidden from search results."}
        {isDraft && "This listing is a draft and not visible to buyers."}
        {currentStatus === "active" && "This listing is live and visible to buyers."}
      </div>
    </div>
  );
}
