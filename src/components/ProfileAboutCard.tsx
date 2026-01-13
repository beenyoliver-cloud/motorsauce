"use client";

import { useEffect, useState } from "react";
import { isMe, nsKey } from "@/lib/auth";
import SellerResponseTimeBadge from "@/components/SellerResponseTimeBadge";

export default function ProfileAboutCard({
  displayName,
  autoEdit = false,
  avgResponseTimeMinutes,
  responseRate,
}: {
  displayName: string;
  autoEdit?: boolean;
  avgResponseTimeMinutes?: number | null;
  responseRate?: number | null;
}) {
  const [me, setMe] = useState(false);
  const [about, setAbout] = useState<string>("");
  const [editing, setEditing] = useState<boolean>(autoEdit);
  const [draft, setDraft] = useState<string>("");

  // Load ownership + about text (only for *your* profile)
  useEffect(() => {
    isMe(displayName).then(isMine => {
      setMe(isMine);
      if (isMine) {
        try {
          const v = localStorage.getItem(nsKey("about_v1")) || "";
          setAbout(v);
          if (autoEdit) setDraft(v);
        } catch {
          setAbout("");
        }
      } else {
        setAbout("");
        setEditing(false);
      }
    });
  }, [displayName, autoEdit]);

  useEffect(() => {
    if (!me) return;
    const syncAbout = () => {
      try {
        const v = localStorage.getItem(nsKey("about_v1")) || "";
        setAbout(v);
        if (!editing) setDraft(v);
      } catch {}
    };
    window.addEventListener("ms:profile", syncAbout as EventListener);
    return () => window.removeEventListener("ms:profile", syncAbout as EventListener);
  }, [me, editing]);

  function startEdit() {
    setDraft(about || "");
    setEditing(true);
  }
  function cancel() {
    setEditing(false);
    setDraft(about || "");
  }
  function save() {
    const text = (draft || "").trim();
    try {
      localStorage.setItem(nsKey("about_v1"), text);
      setAbout(text);
      setEditing(false);
      window.dispatchEvent(new Event("ms:profile"));
    } catch {
      alert("Could not save your profile. Please try again.");
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-lg font-semibold text-black">About {displayName}</h2>

        {me && !editing && (
          <button
            type="button"
            onClick={startEdit}
            className="text-xs px-3 py-1.5 rounded-md border border-gray-300 bg-white text-gray-800 hover:bg-gray-50"
          >
            Edit profile
          </button>
        )}

        {me && editing && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={save}
              className="text-xs px-3 py-1.5 rounded-md bg-yellow-500 text-black hover:bg-yellow-600 font-semibold"
            >
              Save
            </button>
            <button
              type="button"
              onClick={cancel}
              className="text-xs px-3 py-1.5 rounded-md border border-gray-300 bg-white text-gray-800 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Response Time Badge (show for all users if data available) */}
      {!me && avgResponseTimeMinutes !== null && avgResponseTimeMinutes !== undefined && (
        <div className="mt-4">
          <SellerResponseTimeBadge
            avgResponseTimeMinutes={avgResponseTimeMinutes}
            responseRate={responseRate}
            size="md"
          />
        </div>
      )}

      {/* Content / Editor */}
      {!editing ? (
        <div className="mt-2 text-gray-800 whitespace-pre-wrap">
          {about ? about : "This seller hasn't added a bio yet."}
        </div>
      ) : (
        <div className="mt-3">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={6}
            placeholder="Write a short bio about yourself, what you sell, shipping, etc."
            className="w-full rounded-md border border-gray-300 px-3 py-2 bg-white text-gray-900 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-yellow-400"
          />
          <div className="mt-2 text-xs text-gray-600">
            Tip: keep it under 400–600 characters for best readability.
          </div>
        </div>
      )}
    </div>
  );
}
