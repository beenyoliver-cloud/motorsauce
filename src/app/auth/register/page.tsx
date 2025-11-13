"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { registerUser } from "@/lib/auth";

export default function RegisterPage() {
  const router = useRouter();
  const [sp, setSp] = useState(() => new URLSearchParams(typeof window !== 'undefined' ? window.location.search : ""));
  useEffect(() => {
    const onPop = () => setSp(new URLSearchParams(window.location.search));
    window.addEventListener("popstate", onPop as EventListener);
    return () => window.removeEventListener("popstate", onPop as EventListener);
  }, []);
  const next = sp.get("next") || "";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    if (!name.trim()) return setErr("Please enter a display name.");
    if (!email.trim() || !email.includes("@")) return setErr("Please enter a valid email.");
    if (pw.length < 6) return setErr("Password must be at least 6 characters.");
    if (pw !== pw2) return setErr("Passwords do not match.");

    try {
      setBusy(true);
      const user = await registerUser(name, email, pw);
      router.replace(next || `/profile/${encodeURIComponent(user.name)}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not register.");
    } finally {
      setBusy(false);
    }
  }

  const inputBase =
    "border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400 " +
    "bg-white text-gray-900 placeholder-gray-600 caret-gray-900";

  return (
    <section className="max-w-md mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-black mb-4">Create your account</h1>

      {err && (
        <div className="mb-3 rounded-md border border-red-200 bg-red-50 text-red-800 px-3 py-2 text-sm">
          {err}
        </div>
      )}

      <form onSubmit={submit} className="space-y-3">
        <label className="grid gap-1">
          <span className="text-sm text-gray-700">Display name</span>
          <input
            className={inputBase}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Partsguy123"
          />
        </label>

        <label className="grid gap-1">
          <span className="text-sm text-gray-700">Email</span>
          <input
            type="email"
            className={inputBase}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </label>

        <label className="grid gap-1">
          <span className="text-sm text-gray-700">Password</span>
          <input
            type="password"
            className={inputBase}
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder="At least 6 characters"
          />
        </label>

        <label className="grid gap-1">
          <span className="text-sm text-gray-700">Confirm password</span>
          <input
            type="password"
            className={inputBase}
            value={pw2}
            onChange={(e) => setPw2(e.target.value)}
            placeholder="Repeat your password"
          />
        </label>

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-md bg-yellow-500 text-black font-semibold px-4 py-2 hover:bg-yellow-600 disabled:opacity-60"
        >
          {busy ? "Creating…" : "Create account"}
        </button>
      </form>

      <p className="mt-3 text-sm text-gray-700">
        Already have an account?{" "}
        <a
          href={`/auth/login${next ? `?next=${encodeURIComponent(next)}` : ""}`}
          className="text-yellow-600 hover:underline"
        >
          Sign in
        </a>
      </p>
    </section>
  );
}
