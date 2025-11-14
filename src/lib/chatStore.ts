// src/lib/chatStore.ts
/* eslint-disable no-console */

import { nsKey, getCurrentUserSync } from "@/lib/auth";

/* ======================= Types ======================= */
export type OfferStatus =
  | "pending"
  | "started"
  | "countered"
  | "accepted"
  | "declined"
  | "withdrawn"
  | "expired";

export type OfferContent = {
  id: string;
  amountCents: number;
  currency?: string;
  status: OfferStatus;
  starter?: string;
  recipient?: string;
  starterId?: string;
  recipientId?: string;
  buyerId?: string;
  sellerId?: string;
  listingId?: string | number;
  listingTitle?: string;
  listingImage?: string;
  peerName?: string;
  peerId?: string;
};

export type ChatMessage = {
  id?: string;
  from?: string;
  fromId?: string;
  text?: string;
  ts: number;
  type?: "text" | "offer" | "system";
  offer?: OfferContent;
  _k?: string; // dedupe key
};

export type Thread = {
  id: string;
  participants: [string, string];
  self: string;
  peer: string;
  peerAvatar?: string;
  participantsIds?: [string, string];
  selfId?: string;
  peerId?: string;
  messages: ChatMessage[];
  last: string;
  lastTs: number;
  listingRef?: string;
};

/* ======================= Key helpers ======================= */
const sanitize = (x: string) =>
  String(x || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-");
export const slugify = (x: string) => sanitize(x);

function currentIdLike(): string {
  const me = getCurrentUserSync();
  return String(me?.id || me?.email || me?.name || "anon");
}
function currentNameLike(): string {
  const me = getCurrentUserSync();
  return String(me?.name || "You");
}
function suffixFor(idLike?: string | null) {
  return sanitize(idLike || "anon");
}

function KEYS(suffix?: string, version: "v1" | "v2" = "v2") {
  const s = suffix || suffixFor(currentIdLike());
  const v = version === "v2" ? "v2" : "v1";
  return {
    threads: nsKey(`threads_${v}:u:${s}`),
    read: nsKey(`read_threads_${v}:u:${s}`),
    unreadCount: nsKey(`unread_count_${v}:u:${s}`),
  };
}

/* ======================= Storage I/O ======================= */
const hasWindow = () => typeof window !== "undefined";
function readJSON<T>(key: string, fallback: T): T {
  if (!hasWindow()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function writeJSON<T>(key: string, value: T) {
  if (!hasWindow()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn("Failed to persist", key, e);
  }
}

/* ======================= Public helpers ======================= */
export const nowClock = () => Date.now();

/* ---------- small utils ---------- */
function participantsKey(a: string, b: string): [string, string] {
  const [x, y] = [a.trim(), b.trim()].sort((p, q) => p.localeCompare(q));
  return [x, y];
}
function idPair(a?: string, b?: string): [string, string] | undefined {
  if (!a || !b) return undefined;
  const [x, y] = [a.trim(), b.trim()].sort((p, q) => p.localeCompare(q));
  return [x, y];
}
function dedupeKey(msg: ChatMessage): string {
  if (msg.type === "offer" && msg.offer?.id)
    return `offer:${msg.offer.id}:${msg.offer.status}`;
  return (
    msg._k ||
    msg.id ||
    `${msg.from || "sys"}:${msg.ts}:${(msg.text || "").slice(0, 120)}`
  );
}
function makeThreadId(selfName: string, peerName: string, listingRef?: string) {
  const a = slugify(selfName),
    b = slugify(peerName);
  return listingRef ? `t_${a}_${b}_${listingRef}` : `t_${a}_${b}`;
}

/* ======================= Read/Write + unread ======================= */
/** Merge ID + Name buckets (and legacy v1) on every read, and sync union into v2:ID.
 *  IMPORTANT: this function is PURE (no events dispatched), to avoid loops.
 */
export function loadThreads(): Thread[] {
  const idSuf = suffixFor(currentIdLike());
  const nameSuf = suffixFor(currentNameLike());

  // Read all candidate buckets
  const v2_id = readJSON<Thread[]>(KEYS(idSuf, "v2").threads, []);
  const v2_name = readJSON<Thread[]>(KEYS(nameSuf, "v2").threads, []);
  const v1_id = readJSON<Thread[]>(KEYS(idSuf, "v1").threads, []);
  const v1_name = readJSON<Thread[]>(KEYS(nameSuf, "v1").threads, []);

  // Union by id (keep the latest lastTs)
  const byId: Record<string, Thread> = {};
  for (const arr of [v2_id, v2_name, v1_id, v1_name]) {
    for (const t of arr) {
      const prev = byId[t.id];
      if (!prev || (t.lastTs || 0) > (prev.lastTs || 0)) byId[t.id] = t;
    }
  }
  const union = Object.values(byId).sort((a, b) => b.lastTs - a.lastTs);

  // Sync union back into canonical v2:ID so future reads are consistent
  writeJSON(KEYS(idSuf, "v2").threads, union);

  // DO NOT call publishUnread() here — keep loadThreads() side-effect free
  return union;
}

function loadThreadsFor(userIdOrName: string): Thread[] {
  // When writing to a peer store, we stick to v2 under that suffix.
  return readJSON<Thread[]>(KEYS(suffixFor(userIdOrName), "v2").threads, []);
}

export function saveThreads(threads: Thread[]) {
  writeJSON(KEYS(undefined, "v2").threads, threads);
  if (hasWindow()) try { window.dispatchEvent(new Event("ms:threads")); } catch {}
}
function saveThreadsFor(userIdOrName: string, threads: Thread[]) {
  writeJSON(KEYS(suffixFor(userIdOrName), "v2").threads, threads);
  if (hasWindow()) try { window.dispatchEvent(new Event("ms:threads")); } catch {}
}

export function getReadThreads(): string[] {
  return readJSON<string[]>(KEYS(undefined, "v2").read, []);
}
function getReadThreadsFor(userIdOrName: string): string[] {
  return readJSON<string[]>(KEYS(suffixFor(userIdOrName), "v2").read, []);
}

export function setReadThreads(ids: string[]) {
  writeJSON(KEYS(undefined, "v2").read, ids);
  // Caller should compute threads then call publishUnread(threads, ids)
}

/** Re-entrancy guard to avoid event storms. */
let _publishingUnread = false;

export function publishUnread(threads: Thread[], readIds?: string[]) {
  const read = readIds ?? getReadThreads();
  const unread = threads.filter((t) => t.messages.length > 0 && !read.includes(t.id)).length;

  if (!hasWindow()) return;
  try {
    // Write to both the versioned key and the simple key for backwards compatibility
    window.localStorage.setItem(KEYS(undefined, "v2").unreadCount, String(unread));
    window.localStorage.setItem(nsKey("unread_count"), String(unread));

    if (_publishingUnread) return;
    _publishingUnread = true;
    try {
      window.dispatchEvent(new Event("ms:unread"));
    } finally {
      _publishingUnread = false;
    }
  } catch {}
}

/* ======================= Thread management ======================= */
export function upsertThreadForPeer(
  selfName: string,
  peerName: string,
  opts?: {
    preferThreadId?: string;
    initialLast?: string;
    peerAvatar?: string;
    listingRef?: string;
    peerId?: string; // stable peer id (e.g., email)
  }
): Thread {
  const me = getCurrentUserSync();
  const selfId = String(me?.id || me?.email || me?.name || "anon");
  const peerId = opts?.peerId;

  const threads = loadThreads();
  const [p1, p2] = participantsKey(selfName, peerName);
  const idKey = opts?.preferThreadId || makeThreadId(selfName, peerName, opts?.listingRef);

  const found =
    threads.find((t) => t.id === idKey) ||
    threads.find((t) => t.participants[0] === p1 && t.participants[1] === p2);

  if (found) {
    if (!found.selfId) found.selfId = selfId;
    if (!found.peerId && peerId) found.peerId = peerId;
    if (!found.participantsIds && found.selfId && found.peerId) {
      const ids = idPair(found.selfId, found.peerId);
      if (ids) found.participantsIds = ids;
    }
    saveThreads(threads);
    return found;
  }

  const fresh: Thread = {
    id: idKey,
    participants: [p1, p2],
    self: selfName,
    peer: peerName,
    selfId,
    peerId,
    participantsIds: peerId ? idPair(selfId, peerId) : undefined,
    peerAvatar: opts?.peerAvatar,
    messages: [],
    last: opts?.initialLast || "New conversation",
    lastTs: nowClock(),
    listingRef: opts?.listingRef,
  };

  const next = [...threads, fresh];
  saveThreads(next);
  publishUnread(next);
  return fresh;
}

/* ======================= Mirroring (write-through) ======================= */
function candidateTargets(t: Thread, maybeMsg?: ChatMessage): string[] {
  const targets = new Set<string>();
  if (t.peerId) targets.add(t.peerId);   // preferred
  if (t.peer) targets.add(t.peer);       // name fallback

  if (maybeMsg?.fromId && maybeMsg.fromId !== t.selfId) targets.add(maybeMsg.fromId);
  const off = maybeMsg?.offer;
  if (off?.recipientId) targets.add(off.recipientId);
  if (off?.starterId && off.starterId !== t.selfId) targets.add(off.starterId);
  if (off?.peerId) targets.add(off.peerId);
  if (off?.peerName) targets.add(off.peerName);

  if (t.selfId) targets.delete(t.selfId);
  if (t.self) targets.delete(t.self);

  return Array.from(targets).filter(Boolean);
}

function ensurePeerThreadFor(
  target: string,
  peerName: string,
  myId: string,
  myName: string,
  t: Thread
): Thread {
  const peerThreads = loadThreadsFor(target);
  let pt = peerThreads.find((x) => x.id === t.id);
  if (!pt) {
    const namePair = participantsKey(peerName, myName);
    const idsMaybe = idPair(target, myId);
    pt = {
      id: t.id,
      participants: namePair,
      self: peerName,
      peer: myName,
      selfId: target !== peerName ? target : undefined, // if target is a name, leave undefined
      peerId: myId,
      participantsIds: idsMaybe,
      messages: [],
      last: t.last,
      lastTs: t.lastTs,
      listingRef: t.listingRef,
    };
    saveThreadsFor(target, [...peerThreads, pt]);
  } else {
    if (!pt.self) pt.self = peerName;
    if (!pt.peer) pt.peer = myName;
    if (!pt.selfId && target !== peerName) pt.selfId = target;
    if (!pt.peerId) pt.peerId = myId;
    if (!pt.participantsIds && pt.selfId && pt.peerId) {
      const pids = idPair(pt.selfId, pt.peerId);
      if (pids) pt.participantsIds = pids;
    }
  }
  return pt;
}

function mirrorMessageToPeer(t: Thread, msg: ChatMessage) {
  const myId = t.selfId || "";
  const myName = t.self || "You";
  const targets = candidateTargets(t, msg);
  if (targets.length === 0) return;

  for (const target of targets) {
    const peerThreads = loadThreadsFor(target);
    const pt = ensurePeerThreadFor(target, t.peer || "Unknown", myId, myName, t);

    const key = dedupeKey(msg);
    const exists = pt.messages.some((m) => dedupeKey(m) === key);
    if (!exists) pt.messages = [...pt.messages, msg];

    if (msg.type === "offer" && msg.offer) {
      pt.last = `Offer: £${(msg.offer.amountCents / 100).toFixed(2)} (${msg.offer.status})`;
    } else if (msg.text) {
      pt.last = msg.text!;
    }
    pt.lastTs = Math.max(pt.lastTs, msg.ts);

    const idx = peerThreads.findIndex((x) => x.id === pt.id);
    const next = idx >= 0
      ? [...peerThreads.slice(0, idx), pt, ...peerThreads.slice(idx + 1)]
      : [...peerThreads, pt];
    saveThreadsFor(target, next);

    const read = new Set(getReadThreadsFor(target));
    publishUnread(next, Array.from(read));
  }
}

function mirrorUpdateToPeer(t: Thread, updatedMsg: ChatMessage) {
  const myId = t.selfId || "";
  const myName = t.self || "You";
  const targets = candidateTargets(t, updatedMsg);
  if (targets.length === 0) return;

  for (const target of targets) {
    const peerThreads = loadThreadsFor(target);
    const pt = ensurePeerThreadFor(target, t.peer || "Unknown", myId, myName, t);

    const byOfferId = updatedMsg.offer?.id;
    let changed = false;

    if (updatedMsg.type === "offer" && byOfferId) {
      const idx = pt.messages.findIndex((m) => m.type === "offer" && m.offer?.id === byOfferId);
      if (idx >= 0) {
        pt.messages[idx] = { ...pt.messages[idx], ...updatedMsg, _k: dedupeKey(updatedMsg) };
        changed = true;
      } else {
        const exists = pt.messages.some((m) => dedupeKey(m) === dedupeKey(updatedMsg));
        if (!exists) {
          pt.messages = [...pt.messages, updatedMsg];
          changed = true;
        }
      }
    } else {
      const key = dedupeKey(updatedMsg);
      const idx = pt.messages.findIndex((m) => dedupeKey(m) === key);
      if (idx >= 0) {
        pt.messages[idx] = { ...pt.messages[idx], ...updatedMsg, _k: key };
        changed = true;
      } else {
        pt.messages = [...pt.messages, updatedMsg];
        changed = true;
      }
    }

    if (!changed) continue;

    if (updatedMsg.type === "offer" && updatedMsg.offer) {
      pt.last = `Offer: £${(updatedMsg.offer.amountCents / 100).toFixed(2)} (${updatedMsg.offer.status})`;
    } else if (updatedMsg.text) {
      pt.last = updatedMsg.text!;
    }
    pt.lastTs = Math.max(pt.lastTs, updatedMsg.ts);

    const idx2 = peerThreads.findIndex((x) => x.id === pt.id);
    const next = idx2 >= 0
      ? [...peerThreads.slice(0, idx2), pt, ...peerThreads.slice(idx2 + 1)]
      : [...peerThreads, pt];
    saveThreadsFor(target, next);

    const read = new Set(getReadThreadsFor(target));
    publishUnread(next, Array.from(read));
  }
}

/* ======================= Append / Update ======================= */
export function appendMessageOnce(threadId: string, msg: ChatMessage) {
  const threads = loadThreads();
  const t = threads.find((x) => x.id === threadId);
  if (!t) { console.warn("appendMessageOnce: thread not found:", threadId); return; }

  if (!msg.fromId) {
    const me = getCurrentUserSync();
    msg.fromId = String(me?.id || me?.email || me?.name || "");
  }
  if (!msg.from && msg.fromId && t.selfId === msg.fromId) msg.from = t.self || "You";

  if (!t.peerId && msg.offer?.recipientId) {
    const candidate = msg.offer.starterId === t.selfId ? msg.offer.recipientId : msg.offer.starterId;
    if (candidate) t.peerId = candidate;
    if (t.selfId && t.peerId && !t.participantsIds) {
      const pids = idPair(t.selfId, t.peerId);
      if (pids) t.participantsIds = pids;
    }
  }

  const key = dedupeKey(msg);
  const exists = t.messages.some((m) => dedupeKey(m) === key);
  if (exists) return;

  msg._k = key;
  t.messages = [...t.messages, msg];

  if (msg.type === "offer" && msg.offer) {
    t.last = `Offer: £${(msg.offer.amountCents / 100).toFixed(2)} (${msg.offer.status})`;
  } else if (msg.text) {
    t.last = msg.text!;
  }
  t.lastTs = Math.max(t.lastTs, msg.ts);

  saveThreads(threads);
  publishUnread(threads);
  mirrorMessageToPeer(t, msg);
}
export function appendMessage(threadId: string, msg: ChatMessage) {
  appendMessageOnce(threadId, msg);
}

export function appendOfferMessage(
  threadId: string,
  offer: OfferContent,
  actorLabel?: string
) {
  const me = getCurrentUserSync();
  const threads = loadThreads();
  const t = threads.find((x) => x.id === threadId);

  const enriched: OfferContent = {
    ...offer,
    starterId:
      offer.starterId ||
      (offer.starter === "You"
        ? String(me?.id || me?.email || me?.name || "")
        : offer.starterId),
    recipientId: offer.recipientId || offer.peerId || t?.peerId,
  };

  appendMessageOnce(threadId, {
    ts: nowClock(),
    type: "offer",
    offer: enriched,
    text:
      actorLabel &&
      (enriched.status === "started" || enriched.status === "pending"
        ? `${actorLabel} started an offer`
        : `${actorLabel} ${enriched.status} an offer`),
  });
}

export function updateOfferInThread(
  threadId: string,
  offerOrId: string | Partial<OfferContent>,
  nextStatus?: OfferStatus,
  actorLabel?: string
) {
  const threads = loadThreads();
  const t = threads.find((x) => x.id === threadId);
  if (!t) return;

  const byId = typeof offerOrId === "string" ? offerOrId : (offerOrId.id || "");
  if (!byId) return;

  const idx = t.messages.findIndex((m) => m.type === "offer" && m.offer?.id === byId);
  const deriveStatus = () =>
    typeof offerOrId === "string" ? nextStatus : (offerOrId.status ?? nextStatus);

  if (idx >= 0) {
    const existing = t.messages[idx];
    const curr = existing.offer || ({} as OfferContent);

    const merged: OfferContent = {
      ...curr,
      ...(typeof offerOrId === "string" ? {} : offerOrId),
      id: byId,
      status: (deriveStatus() as OfferStatus) || (curr.status as OfferStatus) || "pending",
      starterId: (typeof offerOrId !== "string" && offerOrId.starterId) || curr.starterId,
      recipientId:
        (typeof offerOrId !== "string" && offerOrId.recipientId) ||
        curr.recipientId ||
        t.peerId,
    };

    if (!t.peerId && merged.recipientId && t.selfId) {
      const candidate = merged.starterId === t.selfId ? merged.recipientId : merged.starterId;
      if (candidate) t.peerId = candidate;
      if (!t.participantsIds && t.peerId) {
        const pids = idPair(t.selfId, t.peerId);
        if (pids) t.participantsIds = pids;
      }
    }

    const updated: ChatMessage = {
      ...existing,
      ts: nowClock(),
      type: "offer",
      offer: merged,
      _k: `offer:${merged.id}:${merged.status}`,
      text:
        actorLabel &&
        (merged.status === "started" || merged.status === "pending"
          ? `${actorLabel} started an offer`
          : `${actorLabel} ${merged.status} an offer`),
    };

    t.messages = [...t.messages.slice(0, idx), updated, ...t.messages.slice(idx + 1)];
    t.last = `Offer: £${(merged.amountCents / 100).toFixed(2)} (${merged.status})`;
    t.lastTs = Math.max(t.lastTs, updated.ts);

    saveThreads(threads);
    publishUnread(threads);
    mirrorUpdateToPeer(t, updated);
    return;
  }

  // Not found → append if enough info
  if (typeof offerOrId !== "string" && offerOrId.id && offerOrId.amountCents != null) {
    appendOfferMessage(
      threadId,
      {
        id: offerOrId.id,
        amountCents: offerOrId.amountCents,
        currency: offerOrId.currency,
        status:
          (offerOrId.status as OfferStatus) ?? (nextStatus as OfferStatus) ?? "pending",
        starter: offerOrId.starter,
        recipient: offerOrId.recipient,
        starterId: offerOrId.starterId,
        recipientId: offerOrId.recipientId || t?.peerId,
        listingId: offerOrId.listingId,
        listingTitle: offerOrId.listingTitle,
        listingImage: offerOrId.listingImage,
        peerName: offerOrId.peerName,
        peerId: offerOrId.peerId,
      },
      actorLabel
    );
  }
}

export function appendOfferEvent(
  threadId: string,
  offer: OfferContent,
  actorLabel?: string
) {
  appendOfferMessage(threadId, offer, actorLabel);
}

/* ======================= Read / Delete ======================= */
export function markThreadRead(threadId: string) {
  const read = new Set(getReadThreads());
  if (!read.has(threadId)) {
    read.add(threadId);
    setReadThreads([...read]);
    // caller should publishUnread with current thread list
  }
}

/** Remove this thread from all buckets the current user could be reading. */
export function deleteThread(threadId: string) {
  const meId = currentIdLike();
  const meName = currentNameLike();
  const suffixes = Array.from(new Set([suffixFor(meId), suffixFor(meName)]));

  let changed = false;
  for (const s of suffixes) {
    for (const ver of ["v2", "v1"] as const) {
      const k = KEYS(s, ver);
      const cur = readJSON<Thread[]>(k.threads, []);
      const next = cur.filter((t) => t.id !== threadId);
      if (next.length !== cur.length) {
        writeJSON(k.threads, next);
        changed = true;
      }
      const readList = readJSON<string[]>(k.read, []);
      const nextRead = readList.filter((id) => id !== threadId);
      if (nextRead.length !== readList.length) writeJSON(k.read, nextRead);
      if (ver === "v2" && s === suffixFor(meId)) publishUnread(next);
    }
  }

  if (hasWindow() && changed) {
    try { window.dispatchEvent(new Event("ms:threads")); } catch {}
  }
}
