// src/lib/soldStore.ts
const KEY = "ms:sold:v1";
const EVT = "ms:sold";

export function getSoldIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

/** Add one or more sold IDs and notify listeners */
export function addSoldIds(ids: string[]) {
  if (typeof window === "undefined" || !ids.length) return;
  try {
    const prev = getSoldIds();
    const set = new Set(prev);
    ids.forEach((id) => set.add(id));
    const arr = Array.from(set);
    localStorage.setItem(KEY, JSON.stringify(arr));
    window.dispatchEvent(new Event(EVT)); // 🔔 tell UIs to refresh
  } catch {
    // noop
  }
}

/** Subscribe to sold list changes; returns unsubscribe */
export function onSoldChange(handler: () => void) {
  if (typeof window === "undefined") return () => {};
  const h = handler as EventListener;
  window.addEventListener(EVT, h);
  window.addEventListener("storage", h); // cross-tab updates
  return () => {
    window.removeEventListener(EVT, h);
    window.removeEventListener("storage", h);
  };
}
