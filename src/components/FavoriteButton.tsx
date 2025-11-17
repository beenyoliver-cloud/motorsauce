"use client";

import { useEffect, useState } from "react";
import { Heart, Check } from "lucide-react";
import { getCurrentUserSync, nsKey } from "@/lib/auth";

function readFavs(): string[] {
  const u = getCurrentUserSync();
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
  const u = getCurrentUserSync();
  if (!u) return; // require sign-in to save
  const unique = Array.from(new Set(ids.map(String)));
  localStorage.setItem(nsKey("favs_v1"), JSON.stringify(unique));
  window.dispatchEvent(new Event("favorites-changed"));
}

// Toast notification system
function showToast(message: string, type: "success" | "info" = "success") {
  const existing = document.getElementById("favorite-toast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.id = "favorite-toast";
  toast.className = `fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium transition-all ${
    type === "success" ? "bg-pink-600" : "bg-gray-800"
  }`;
  toast.style.animation = "slideUp 0.3s ease-out";
  
  const icon = document.createElement("div");
  icon.innerHTML = type === "success" 
    ? '<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>'
    : '<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/></svg>';
  
  toast.appendChild(icon);
  toast.appendChild(document.createTextNode(message));
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = "slideDown 0.3s ease-in";
    setTimeout(() => toast.remove(), 300);
  }, 2500);
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
    const u = getCurrentUserSync();
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
    const isAdding = !set.has(id);
    
    if (isAdding) {
      set.add(id);
      showToast("Added to saved items", "success");
    } else {
      set.delete(id);
      showToast("Removed from saved items", "info");
    }
    
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
        .ms-fav-btn {
          transition: all 0.2s ease;
        }
        .ms-fav-btn:hover {
          transform: scale(1.05);
        }
        .ms-fav-btn svg {
          stroke: #1f2937 !important; /* gray-800 */
          fill: none !important;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .ms-fav-btn[data-saved="true"] svg {
          stroke: #be185d !important; /* pink-700 */
          fill: #be185d !important;
          animation: heartPop 0.3s ease;
        }
        .ms-fav-btn:active {
          transform: scale(0.95);
        }
        @keyframes heartPop {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.2); }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translate(-50%, 20px);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0);
          }
        }
        @keyframes slideDown {
          from {
            opacity: 1;
            transform: translate(-50%, 0);
          }
          to {
            opacity: 0;
            transform: translate(-50%, 20px);
          }
        }
      `}</style>
    </>
  );
}
