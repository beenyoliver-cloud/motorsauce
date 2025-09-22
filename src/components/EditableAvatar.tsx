"use client";

import { useEffect, useRef, useState } from "react";
import { Pencil } from "lucide-react";
import { isMe, nsKey } from "@/lib/auth";

function getInitials(label: string) {
  const s = (label || "").trim();
  if (!s) return "U";
  const parts = s.split(/\s+/);
  return parts.length === 1
    ? (s[0] + (s[s.length - 1] || "")).toUpperCase()
    : (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function EditableAvatar({
  displayName,
  className = "",
}: {
  displayName: string;
  className?: string;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const mine = isMe(displayName);
    setCanEdit(mine);

    if (mine) {
      // Only your own profile reads your stored avatar
      try {
        const val = localStorage.getItem(nsKey("avatar_v1"));
        setSrc(val || null);
      } catch {
        setSrc(null);
      }
      const onProfile = () => {
        try {
          const v = localStorage.getItem(nsKey("avatar_v1"));
          setSrc(v || null);
        } catch {}
      };
      window.addEventListener("ms:profile", onProfile as EventListener);
      return () => window.removeEventListener("ms:profile", onProfile as EventListener);
    } else {
      // Someone else’s profile → never show *your* stored avatar
      setSrc(null);
    }
  }, [displayName]);

  const initials = getInitials(displayName);

  function pickFile() {
    inputRef.current?.click();
  }

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please choose an image file.");
      e.target.value = "";
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert("Image is larger than 2MB. Please choose a smaller image.");
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      try {
        localStorage.setItem(nsKey("avatar_v1"), dataUrl);
        setSrc(dataUrl);
        window.dispatchEvent(new Event("ms:profile"));
      } catch {
        alert("Could not save your photo. Try a smaller image.");
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  return (
    <div className={`relative group ${className}`}>
      {/* Avatar circle */}
      <div className="h-20 w-20 md:h-24 md:w-24 rounded-full ring-2 ring-yellow-500 ring-offset-2 ring-offset-white overflow-hidden shadow flex items-center justify-center bg-gray-900 text-white text-2xl font-semibold">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={`${displayName} avatar`} className="h-full w-full object-cover" />
        ) : (
          <span>{initials}</span>
        )}
      </div>

      {/* Pencil: visible on mobile; md+ shows on hover. Only on your own profile */}
      {canEdit && (
        <>
          <button
            type="button"
            onClick={pickFile}
            className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-white border border-gray-300 shadow-sm
                       flex items-center justify-center text-gray-700
                       transition md:opacity-0 md:translate-y-1
                       md:group-hover:opacity-100 md:group-hover:translate-y-0
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400
                       focus:opacity-100"
            aria-label="Change profile photo"
            title="Change profile photo"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <input ref={inputRef} type="file" accept="image/*" onChange={onPickFile} hidden />
        </>
      )}
    </div>
  );
}
