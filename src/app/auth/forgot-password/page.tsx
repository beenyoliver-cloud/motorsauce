"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase";
import CenteredCard from "@/components/layout/CenteredCard";
import { Mail, CheckCircle } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    if (!email.trim() || !email.includes("@")) {
      return setErr("Please enter a valid email address.");
    }

    try {
      setBusy(true);
      const supabase = supabaseBrowser();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) {
        const message = error.message?.toLowerCase() || "";
        if (message.includes("rate limit") || message.includes("too many") || error.status === 429) {
          throw new Error("Too many requests. Please wait a few minutes before trying again.");
        }
        const friendlyMessage =
          error.message && error.message.trim() && error.message.trim() !== "{}"
            ? error.message
            : "Failed to send reset email. Please try again.";
        throw new Error(friendlyMessage);
      }

      setSuccess(true);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to send reset email. Please try again.";
      const normalized = message.trim().toLowerCase();
      if (normalized.includes("rate limit") || normalized.includes("too many")) {
        setErr("Too many attempts. Please wait a few minutes before trying again.");
      } else {
        setErr(message && message !== "{}" ? message : "Failed to send reset email. Please try again.");
      }
    } finally {
      setBusy(false);
    }
  }

  const inputBase =
    "border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400 " +
    "bg-white text-gray-900 placeholder-gray-600 caret-gray-900";

  if (success) {
    return (
      <CenteredCard
        title="Check your email"
        overlayImage="/images/msracing1.jpg"
        maxWidth="md"
        pad="p-8"
      >
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <p className="text-gray-700">
            We&apos;ve sent a password reset link to <strong>{email}</strong>
          </p>
          <p className="text-sm text-gray-500">
            Click the link in the email to reset your password. If you don&apos;t see it, check your spam folder.
          </p>
          <a
            href="/auth/login"
            className="inline-block mt-4 text-yellow-600 hover:underline font-medium"
          >
            ← Back to sign in
          </a>
        </div>
      </CenteredCard>
    );
  }

  return (
    <CenteredCard
      title="Reset your password"
      overlayImage="/images/msracing1.jpg"
      maxWidth="md"
      pad="p-8"
      footer={
        <p className="text-sm text-gray-800 text-center">
          Remember your password?{" "}
          <a
            href="/auth/login"
            className="text-yellow-600 hover:underline font-medium"
          >
            Sign in
          </a>
        </p>
      }
    >
      <div className="mb-4 flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <Mail className="w-5 h-5 text-blue-600 flex-shrink-0" />
        <p className="text-sm text-blue-800">
          Enter your email address and we&apos;ll send you a link to reset your password.
        </p>
      </div>

      {err && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 text-red-800 px-3 py-2 text-sm">
          {err}
        </div>
      )}

      <form onSubmit={submit} className="space-y-4">
        <label className="grid gap-1">
          <span className="text-sm text-gray-700">Email address</span>
          <input
            type="email"
            className={inputBase}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            autoFocus
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-md bg-yellow-500 text-black font-semibold px-4 py-2 hover:bg-yellow-600 disabled:opacity-60 shadow-sm"
        >
          {busy ? "Sending..." : "Send reset link"}
        </button>
      </form>
    </CenteredCard>
  );
}
