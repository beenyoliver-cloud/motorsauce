// src/lib/chatStore.ts
"use client";

export type Thread = {
  id: string;
  peerId?: string;
  peerName?: string;
  title?: string;
};
export type ChatMessage = {
  id: string;
  from: string; // "You" | username | "system"
  ts: string;
  type?: "text" | "system" | "offer";
  text?: string;
};

export function slugify(s: string): string {
  return (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
}

export function nowClock() {
  return new Date().toISOString();
}

// Minimal in-memory/local storage thread list
const THREADS_KEY = "ms:threads:v1";
const MESSAGES_KEY = (id: string) => `ms:messages:${id}`;

function readThreads(): Thread[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(THREADS_KEY);
    return raw ? (JSON.parse(raw) as Thread[]) : [];
  } catch {
    return [];
  }
}
function writeThreads(t: Thread[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(THREADS_KEY, JSON.stringify(t));
}

export function loadThreads(): Thread[] {
  return readThreads();
}

export function upsertThreadForPeer(peerName: string): Thread {
  const t = readThreads();
  const id = `thr_${slugify(peerName)}`;
  const existing = t.find((x) => x.id === id);
  if (existing) return existing;
  const thr: Thread = { id, peerName };
  t.push(thr);
  writeThreads(t);
  return thr;
}

export function appendMessage(threadId: string, msg: ChatMessage) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(MESSAGES_KEY(threadId));
    const arr: ChatMessage[] = raw ? JSON.parse(raw) : [];
    arr.push(msg);
    localStorage.setItem(MESSAGES_KEY(threadId), JSON.stringify(arr));
    window.dispatchEvent(new CustomEvent("ms:chat", { detail: { threadId } }));
  } catch {}
}

export function appendOfferMessage(threadId: string, msg: any) {
  appendMessage(threadId, {
    id: msg?.id ?? `offer_${Date.now()}`,
    from: "system",
    ts: nowClock(),
    type: "offer",
    text: "",
  });
}

export function updateOfferInThread(_threadId: string, _payload: any) {
  // no-op placeholder for UI compatibility
}

export function resetAllChatData() {
  if (typeof window === "undefined") return;
  try {
    for (const k of Object.keys(localStorage)) {
      if (k.startsWith("ms:messages:") || k === THREADS_KEY) {
        localStorage.removeItem(k);
      }
    }
    window.dispatchEvent(new CustomEvent("ms:chat", { detail: { reset: true } }));
  } catch {}
}
