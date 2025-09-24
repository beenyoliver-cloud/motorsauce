"use client";
export type Thread = { id: string; peerName?: string };
export type ChatMessage = { id: string; from: string; ts: string; type?: string; text?: string };
export function slugify(s:string){return (s||"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)+/g,"");}
export function nowClock(){ return new Date().toISOString(); }
export function loadThreads():Thread[]{ return []; }
export function upsertThreadForPeer(peerName:string){ return { id:`thr_${slugify(peerName)}`, peerName }; }
export function appendMessage(..._args:any[]){ /* no-op */ }
export function appendOfferMessage(..._args:any[]){ /* no-op */ }
export function updateOfferInThread(..._args:any[]){ /* no-op */ }
export function resetAllChatData(){ /* no-op */ }
