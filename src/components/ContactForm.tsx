"use client";

import { useState } from "react";

export default function ContactForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !message) return;

    setStatus("submitting");
    setError(null);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, message }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to send message");
      }

      setStatus("success");
      setEmail("");
      setMessage("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
      setStatus("error");
    }
  }

  return (
    <form className="grid gap-4 max-w-xl" onSubmit={handleSubmit}>
      <label className="grid gap-1">
        <span className="text-sm font-medium">Your email</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400"
          required
        />
      </label>

      <label className="grid gap-1">
        <span className="text-sm font-medium">Message</span>
        <textarea
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="How can we help?"
          className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400"
          required
        />
      </label>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">{error}</div>
      )}

      {status === "success" && (
        <div className="rounded-md border border-green-200 bg-green-50 p-2 text-sm text-green-700">
          Thanks! We&apos;ve received your message.
        </div>
      )}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="inline-flex items-center justify-center rounded-md px-4 py-2 bg-yellow-500 text-black font-medium hover:bg-yellow-600 transition disabled:opacity-60"
      >
        {status === "submitting" ? "Sending…" : "Send"}
      </button>
    </form>
  );
}
