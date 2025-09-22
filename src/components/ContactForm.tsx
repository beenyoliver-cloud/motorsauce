"use client";

export default function ContactForm() {
  return (
    <form className="grid gap-4 max-w-xl" onSubmit={(e) => e.preventDefault()}>
      <label className="grid gap-1">
        <span className="text-sm font-medium">Your email</span>
        <input
          type="email"
          placeholder="you@example.com"
          className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400"
          required
        />
      </label>

      <label className="grid gap-1">
        <span className="text-sm font-medium">Message</span>
        <textarea
          rows={5}
          placeholder="How can we help?"
          className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400"
          required
        />
      </label>

      <button
        type="submit"
        className="inline-flex items-center justify-center rounded-md px-4 py-2 bg-yellow-500 text-black font-medium hover:bg-yellow-600 transition"
        onClick={() => alert("Thanks! This is a placeholder form for the MVP.")}
      >
        Send
      </button>
    </form>
  );
}
