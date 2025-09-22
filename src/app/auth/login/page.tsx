// src/app/auth/login/page.tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { loginWithEmail } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get("next") || "";

  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    if (!email.trim() || !email.includes("@")) return setErr("Please enter a valid email.");
    if (!pw) return setErr("Please enter your password.");

    try {
      setBusy(true);
      const user = await loginWithEmail(email, pw);
      router.replace(next || `/profile/${encodeURIComponent(user.name)}`);
    } catch (e: any) {
      setErr(e?.message || "Sign in failed.");
    } finally {
      setBusy(false);
    }
  }

  const inputBase =
    "border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400 " +
    "bg-white text-gray-900 placeholder-gray-600 caret-gray-900";

  return (
    <div className="relative min-h-screen">
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/images/msracing1.jpg')" }}
        aria-hidden="true"
      />
      {/* Dark overlay for contrast */}
      <div className="absolute inset-0 bg-black/40" aria-hidden="true" />

      {/* Form container */}
      <section className="relative z-10 min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl bg-white/90 backdrop-blur border border-gray-200 shadow-xl p-6">
          <h1 className="text-2xl font-bold text-black mb-4">Sign in</h1>

          {err && (
            <div className="mb-3 rounded-md border border-red-200 bg-red-50 text-red-800 px-3 py-2 text-sm">
              {err}
            </div>
          )}

          <form onSubmit={submit} className="space-y-3">
            <label className="grid gap-1">
              <span className="text-sm text-gray-700">Email</span>
              <input
                type="email"
                className={inputBase}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </label>

            <label className="grid gap-1">
              <span className="text-sm text-gray-700">Password</span>
              <input
                type="password"
                className={inputBase}
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                placeholder="Your password"
                autoComplete="current-password"
              />
            </label>

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-md bg-yellow-500 text-black font-semibold px-4 py-2 hover:bg-yellow-600 disabled:opacity-60"
            >
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="mt-3 text-sm text-gray-800">
            New here?{" "}
            <a
              href={`/auth/register${next ? `?next=${encodeURIComponent(next)}` : ""}`}
              className="text-yellow-600 hover:underline"
            >
              Create an account
            </a>
          </p>
        </div>
      </section>
    </div>
  );
}
