"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { getCurrentUser, nsKey } from "@/lib/auth";

function readFavs(): string[] {
  const u = getCurrentUser();
  if (!u) return []; // not signed in => nothing saved
  try {
    const raw = localStorage.getItem(nsKey("favs_v1"));
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.map(String) : [];
  } catch {
    return [];
  }
}
function writeFavs(ids: string[]) {
  const u = getCurrentUser();
  if (!u) return; // require sign-in to save
  const unique = Array.from(new Set(ids.map(String)));
  localStorage.setItem(nsKey("favs_v1"), JSON.stringify(unique));
  window.dispatchEvent(new Event("favorites-changed"));
}

export default function FavoriteButton({
  listingId,
  className = "",
  showLabel = true,
}: {
  listingId: string | number;
  className?: string;
  showLabel?: boolean;
}) {
  const id = String(listingId);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const sync = () => setSaved(readFavs().includes(id));
    sync();
    const onStorage = () => sync();
    const onFavs = () => sync();
    window.addEventListener("storage", onStorage);
    window.addEventListener("favorites-changed", onFavs as EventListener);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("favorites-changed", onFavs as EventListener);
    };
  }, [id]);

  function requireAuth() {
    const u = getCurrentUser();
    if (!u) {
      const next = encodeURIComponent(window.location.href);
      window.location.assign(`/auth/login?next=${next}`);
      return false;
    }
    return true;
  }

  function toggle(e?: React.MouseEvent) {
    e?.preventDefault();
    e?.stopPropagation();
    if (!requireAuth()) return;

    const set = new Set(readFavs());
    set.has(id) ? set.delete(id) : set.add(id);
    writeFavs([...set]);
    setSaved(set.has(id));
  }

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        aria-pressed={saved}
        aria-label={saved ? "Remove from saved" : "Save this listing"}
        data-saved={saved ? "true" : "false"}
        className={[
          "ms-fav-btn inline-flex items-center gap-2 px-3 py-2 rounded-md border text-sm transition",
          saved
            ? "bg-pink-100 text-pink-800 border-pink-400"
            : "bg-white text-gray-900 border-gray-600 hover:bg-gray-100",
          className,
        ].join(" ")}
      >
        <Heart className="h-4 w-4" />
        {showLabel && <span>{saved ? "Saved" : "Save"}</span>}
      </button>

      <style jsx>{`
        .ms-fav-btn svg {
          stroke: #1f2937 !important; /* gray-800 */
          fill: none !important;
          transition: transform 0.15s ease;
        }
        .ms-fav-btn[data-saved="true"] svg {
          stroke: #be185d !important; /* pink-700 */
          fill: #be185d !important;
        }
        .ms-fav-btn:active svg { transform: scale(0.92); }
      `}</style>
    </>
  );
}
