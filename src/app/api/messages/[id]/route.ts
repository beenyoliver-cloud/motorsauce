// src/app/api/messages/[id]/route.ts
import { NextResponse } from "next/server";
import { store, upsertPeer, addMessage, Message } from "../../_lib/mem"; // ← relative

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: RouteContext) {
  const params = await ctx.params;
  const peerId = decodeURIComponent(params.id || "");
  const url = new URL(req.url);
  const wantMessages = url.searchParams.has("messages");

  const peer = upsertPeer(peerId);

  if (!wantMessages) return NextResponse.json({ peer });

  const items = (store.messagesByPeer[peerId] || []).sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt)
  );
  return NextResponse.json({ messages: items });
}

export async function POST(req: Request, ctx: RouteContext) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available' }, { status: 404 });
  }
  const params = await ctx.params;
  const peerId = decodeURIComponent(params.id || "");
  const body = await req.json();

  // TODO: replace with real auth
  const me = { id: "me", name: "You" };
  const now = new Date().toISOString();

  const msg: Message =
    body.type === "offer"
      ? {
          id: Math.random().toString(36).slice(2),
          fromUserId: me.id,
          toUserId: peerId,
          createdAt: now,
          type: "offer",
          offer: {
            ...body.offer,
            status: "proposed",
            actorId: me.id,
            expiresAt: body.offer?.expiresAt || new Date(Date.now() + 48 * 3600_000).toISOString(),
          },
        }
      : {
          id: Math.random().toString(36).slice(2),
          fromUserId: me.id,
          toUserId: peerId,
          createdAt: now,
          type: "text",
          body: String(body.body || ""),
        };

  addMessage(peerId, msg);
  return NextResponse.json({ message: msg });
}
