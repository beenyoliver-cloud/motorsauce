// src/lib/moderationStore.ts
const NS = "ms:mod";
const hasWindow = typeof window !== "undefined";

export type Report = {
  id: string; // listingId or userId
  kind: "listing" | "user";
  reason: string;
  ts: number;
};

function kReports() { return `${NS}:reports`; }
function kHiddenListings() { return `${NS}:hidden:listings`; }

export function listReports(): Report[] {
  if (!hasWindow) return [];
  try {
    const raw = localStorage.getItem(kReports());
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

export function addReport(r: Report) {
  if (!hasWindow) return;
  const arr = listReports();
  arr.push(r);
  localStorage.setItem(kReports(), JSON.stringify(arr));
  window.dispatchEvent(new CustomEvent("ms:mod"));
}

export function hideListingForUser(listingId: string) {
  if (!hasWindow) return;
  const raw = localStorage.getItem(kHiddenListings());
  const ids = new Set<string>(raw ? JSON.parse(raw) : []);
  ids.add(String(listingId));
  localStorage.setItem(kHiddenListings(), JSON.stringify(Array.from(ids)));
  window.dispatchEvent(new CustomEvent("ms:mod"));
}

export function isListingHidden(listingId: string): boolean {
  if (!hasWindow) return false;
  try {
    const raw = localStorage.getItem(kHiddenListings());
    const ids: string[] = raw ? JSON.parse(raw) : [];
    return ids.includes(String(listingId));
  } catch { return false; }
}
