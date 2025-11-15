// src/app/api/offers/route.ts
import { NextResponse } from "next/server";
import { store, findMessageById } from "../_lib/mem"; // ← relative

type Action = "accept" | "decline" | "withdraw" | "counter";

export async function POST(req: Request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available' }, { status: 404 });
  }
  const { messageId, action, amount } = (await req.json()) as {
    messageId: string;
    action: Action;
    amount?: number;
  };

  const found = findMessageById(messageId);
  if (!found) return NextResponse.json({ error: "Message not found" }, { status: 404 });

  const { peerId, index, message } = found;
  if (message.type !== "offer" || !message.offer) {
    return NextResponse.json({ error: "Not an offer" }, { status: 400 });
  }

  if (action === "accept") {
    message.offer.status = "accepted";
  } else if (action === "decline") {
    message.offer.status = "declined";
  } else if (action === "withdraw") {
    message.offer.status = "withdrawn";
  } else if (action === "counter") {
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) {
      return NextResponse.json({ error: "Invalid counter amount" }, { status: 400 });
    }
    message.offer.amount = n;
    message.offer.status = "counter";
  } else {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  store.messagesByPeer[peerId][index] = { ...message };
  return NextResponse.json({ message: store.messagesByPeer[peerId][index] });
}
