"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, RotateCcw } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase";

type Props = {
  listingId: string | number;
  currentStatus?: "active" | "draft" | "sold";
  isOwner: boolean;
};

export default function MarkAsSoldButton({ listingId, currentStatus = "active", isOwner }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  if (!isOwner) return null;

  const isSold = currentStatus === "sold";

  async function handleToggle() {
    setLoading(true);
    setError(null);

    try {
      const supabase = supabaseBrowser();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setError("You must be logged in");
        setLoading(false);
        return;
      }

      const action = isSold ? "mark_active" : "mark_sold";

      const response = await fetch("/api/listings/mark-sold", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
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

      // Refresh the page to show updated status
      router.refresh();
    } catch (err: any) {
      console.error("Error toggling sold status:", err);
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleToggle}
        disabled={loading}
        className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
          isSold
            ? "bg-gray-200 text-gray-700 hover:bg-gray-300"
            : "bg-green-600 text-white hover:bg-green-700"
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isSold ? (
          <RotateCcw className="h-4 w-4" />
        ) : (
          <CheckCircle2 className="h-4 w-4" />
        )}
        {loading ? "Updating..." : isSold ? "Mark as Available" : "Mark as Sold"}
      </button>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {isSold && !loading && (
        <p className="text-xs text-gray-600">
          This listing is marked as sold and hidden from search results.
        </p>
      )}
    </div>
  );
}
