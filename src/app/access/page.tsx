"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function AccessGateInner() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get("next") || "/";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || "Invalid password");
      }
      router.replace(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mx-auto max-w-md px-4 py-10">
      <h1 className="mb-4 text-2xl font-bold text-black">Enter Access Password</h1>
      <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-gray-200 bg-white p-6">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-400"
            placeholder="••••••••"
            autoFocus
          />
        </div>
        {error && <div className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">{error}</div>}
        <button
          type="submit"
          disabled={loading || !password}
          className={`w-full rounded-md px-4 py-2 font-semibold ${loading || !password ? "bg-yellow-300 text-black" : "bg-yellow-500 text-black hover:bg-yellow-600"}`}
        >
          {loading ? "Checking…" : "Unlock Site"}
        </button>
      </form>
      <p className="mt-4 text-xs text-gray-600">This site is currently gated. Ask the owner for the access password.</p>
    </section>
  );
}

export default function AccessGatePage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-gray-600">Loading access gate…</div>}>
      <AccessGateInner />
    </Suspense>
  );
}
