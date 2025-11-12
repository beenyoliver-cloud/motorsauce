// src/app/api/messages/route.ts
import { NextResponse } from "next/server";
import { loadThreads } from "@/lib/chatStore";

export async function GET() {
  // Summarise threads for the Messages sidebar
  const threads = loadThreads();

  const peers = threads.map((t) => {
    const lastMsg = t.messages[t.messages.length - 1];
    const lastSnippet =
      lastMsg?.type === "offer" && lastMsg.offer
        ? `Offer: £${(lastMsg.offer.amountCents / 100).toFixed(2)} (${lastMsg.offer.status})`
        : lastMsg?.text ?? t.last;

    // You can refine which name to show here if needed
    return {
      id: t.id,
      name: t.peer || t.self || "Unknown",
      avatar: t.peerAvatar,
      lastSnippet,
      lastMessageAt: new Date(t.lastTs).toISOString(),
    };
  });

  return NextResponse.json({ peers });
}
