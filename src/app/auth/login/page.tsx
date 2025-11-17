// src/app/auth/login/page.tsx
"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { loginWithEmail } from "@/lib/auth";

import CenteredCard from "@/components/layout/CenteredCard";

export default function LoginPage() {
  const router = useRouter();
  const [sp, setSp] = useState(() => new URLSearchParams(typeof window !== 'undefined' ? window.location.search : ""));
  useEffect(() => {
    const onPop = () => setSp(new URLSearchParams(window.location.search));
    window.addEventListener("popstate", onPop as EventListener);
    return () => window.removeEventListener("popstate", onPop as EventListener);
  }, []);
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

    const startTime = Date.now();
    console.log('[login page] Starting login', { email: email.substring(0, 3) + '***' });

    try {
      setBusy(true);
      
      // First, use server-side login to set cookies for middleware
      const beforeServerCall = Date.now();
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password: pw }),
      });
      const serverCallDuration = Date.now() - beforeServerCall;
      console.log('[login page] Server call completed', { duration: serverCallDuration, status: response.status });

      const data = await response.json();

      if (!response.ok || data.error) {
        console.error('[login page] Server returned error', { error: data.error, status: response.status });
        setErr(data.error || 'Login failed. Please try again.');
        return;
      }

      if (!data.user) {
        console.error('[login page] Server returned no user');
        setErr("Login failed. Please try again.");
        return;
      }

      // Also do client-side login to update cache immediately
      const beforeClientLogin = Date.now();
      const { user: clientUser } = await loginWithEmail(email, pw);
      const clientLoginDuration = Date.now() - beforeClientLogin;
      console.log('[login page] Client login completed', { duration: clientLoginDuration });
      
      // Dispatch auth event to update UI
      window.dispatchEvent(new Event("ms:auth"));
      
      const totalDuration = Date.now() - startTime;
      console.log('[login page] Login complete', { totalDuration, serverCallDuration, clientLoginDuration });
      
      // Use router.replace for smooth navigation without full reload
      router.replace(next || `/profile/${encodeURIComponent(data.user.name)}`);
    } catch (e) {
      const totalDuration = Date.now() - startTime;
      console.error('[login page] Exception', { error: e instanceof Error ? e.message : String(e), totalDuration });
      setErr(e instanceof Error ? e.message : "Sign in failed.");
    } finally {
      setBusy(false);
    }
  }

  const inputBase =
    "border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400 " +
    "bg-white text-gray-900 placeholder-gray-600 caret-gray-900";

  return (
    <CenteredCard
      title="Sign in"
      overlayImage="/images/msracing1.jpg"
      maxWidth="md"
      pad="p-8"
      footer={
        <p className="text-sm text-gray-800 text-center">
          New here?{" "}
          <a
            href={`/auth/register${next ? `?next=${encodeURIComponent(next)}` : ""}`}
            className="text-yellow-600 hover:underline font-medium"
          >
            Create an account
          </a>
        </p>
      }
    >
      {err && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 text-red-800 px-3 py-2 text-sm">
          {err}
        </div>
      )}
      <form onSubmit={submit} className="space-y-4">
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
          className="w-full rounded-md bg-yellow-500 text-black font-semibold px-4 py-2 hover:bg-yellow-600 disabled:opacity-60 shadow-sm"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </CenteredCard>
  );
}
