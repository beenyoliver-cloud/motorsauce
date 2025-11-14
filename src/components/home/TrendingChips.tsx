"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const CURATED = [
  "coilovers",
  "exhaust",
  "air filter",
  "brake pads",
  "spark plugs",
  "track day",
  "oem parts",
];

const K_RECENT = "ms:recent-searches";
const K_HIDDEN = "ms:trending:hidden";

export default function TrendingChips() {
  const [recent, setRecent] = useState<string[]>([]);
  const [hidden, setHidden] = useState<string[]>([]);

  useEffect(() => {
    try {
      const r = localStorage.getItem(K_RECENT);
      setRecent(Array.isArray(JSON.parse(r || "null")) ? JSON.parse(r as string) : []);
    } catch {}
    try {
      const h = localStorage.getItem(K_HIDDEN);
      setHidden(Array.isArray(JSON.parse(h || "null")) ? JSON.parse(h as string) : []);
    } catch {}
  }, []);

  const chips = useMemo(() => {
    const uniq = Array.from(new Set([...
      recent.filter(Boolean),
      ...CURATED,
    ].flat().map((s) => String(s).trim().toLowerCase()).filter(Boolean)));
    return uniq.filter((s) => !hidden.includes(s)).slice(0, 10);
  }, [recent, hidden]);

  function hide(term: string) {
    const t = term.toLowerCase();
    const next = Array.from(new Set([...(hidden || []), t]));
    setHidden(next);
    try { localStorage.setItem(K_HIDDEN, JSON.stringify(next)); } catch {}
  }

  if (!chips.length) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-2 text-xs">
      {chips.map((q) => (
        <div key={q} className="inline-flex items-center gap-1 rounded-full bg-gray-100 text-gray-800 border border-gray-200 px-3 py-1">
          <Link href={`/search?q=${encodeURIComponent(q)}`} className="hover:underline">{q}</Link>
          <button
            aria-label={`Hide ${q}`}
            onClick={() => hide(q)}
            className="ml-1 rounded-full px-1 hover:bg-gray-200"
          >×</button>
        </div>
      ))}
    </div>
  );
}
