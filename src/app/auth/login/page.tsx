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
      pad="p-4 sm:p-6"
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
        <div className="mb-3 rounded-md border border-red-200 bg-red-50 text-red-800 px-3 py-2 text-sm">
          {err}
        </div>
      )}

      {/* Google Sign-In Button */}
      <button
        type="button"
        onClick={() => alert('Google sign-in not yet configured. Please use email/password.')}
        className="w-full flex items-center justify-center gap-3 rounded-md bg-white border border-gray-300 text-gray-700 font-medium px-4 py-2.5 hover:bg-gray-50 hover:border-gray-400 transition-colors shadow-sm"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        Continue with Google
      </button>

      {/* Divider */}
      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white/95 text-gray-500">Or continue with email</span>
        </div>
      </div>

      {/* Email/Password Form */}
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
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">Password</span>
            <a
              href="/auth/forgot-password"
              className="text-xs text-yellow-600 hover:underline"
            >
              Forgot password?
            </a>
          </div>
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
          className="w-full rounded-md bg-yellow-500 text-black font-semibold px-4 py-2.5 hover:bg-yellow-600 disabled:opacity-60 shadow-sm transition-colors"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </CenteredCard>
  );
}
