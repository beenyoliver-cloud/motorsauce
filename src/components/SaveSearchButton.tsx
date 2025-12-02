"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Save } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase";

export default function SaveSearchButton() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [searchName, setSearchName] = useState("");

  // Check if there are any active filters
  const hasFilters = () => {
    const params = Array.from(searchParams.entries());
    // Exclude pagination and sort params
    return params.some(
      ([key]) => !["page", "sort"].includes(key)
    );
  };

  if (!hasFilters()) {
    return null; // Don't show button if no filters active
  }

  async function handleSave() {
    if (!searchName.trim()) {
      alert("Please enter a name for this search");
      return;
    }

    setSaving(true);
    try {
      const supabase = supabaseBrowser();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push(`/auth/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
        return;
      }

      // Build filters object from search params
      const filters: any = {};
      searchParams.forEach((value, key) => {
        if (!["page", "sort"].includes(key)) {
          filters[key] = value;
        }
      });

      const response = await fetch("/api/saved-searches", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          name: searchName.trim(),
          filters,
          notify_new_matches: true,
        }),
      });

      if (response.ok) {
        alert("Search saved successfully!");
        setShowModal(false);
        setSearchName("");
      } else {
        const error = await response.json();
        alert(error.error || "Failed to save search");
      }
    } catch (error) {
      console.error("Save search error:", error);
      alert("Failed to save search");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <Save className="h-4 w-4" />
        Save Search
      </button>

      {/* Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-4 text-xl font-bold text-gray-900">
              Save This Search
            </h2>
            <p className="mb-4 text-sm text-gray-600">
              Give this search a name and we&apos;ll save your filters. You can quickly
              access it later from your saved searches.
            </p>

            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Search Name
              </label>
              <input
                type="text"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                placeholder="e.g., BMW M3 Exhausts"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-yellow-500 focus:outline-none focus:ring-1 focus:ring-yellow-500"
                autoFocus
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 rounded-lg bg-yellow-500 px-4 py-2 font-medium text-white hover:bg-yellow-600 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Search"}
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
