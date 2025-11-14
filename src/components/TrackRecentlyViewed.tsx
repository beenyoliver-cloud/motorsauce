"use client";

import { useEffect } from "react";

export default function TrackRecentlyViewed({ id }: { id: string | number }) {
  useEffect(() => {
    try {
      const key = "ms:recently-viewed";
      const raw = localStorage.getItem(key);
      const arr: Array<string | number> = raw ? JSON.parse(raw) : [];
      const idStr = String(id);
      const next = [idStr, ...arr.filter((x) => String(x) !== idStr)].slice(0, 24);
      localStorage.setItem(key, JSON.stringify(next));
    } catch {}
  }, [id]);
  return null;
}
