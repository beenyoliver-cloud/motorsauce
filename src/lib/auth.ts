// src/lib/auth.ts
"use client";

export type LocalUser = { id: string; name: string; email: string };
type StoredUser = LocalUser & { passwordHash: string };

const UID_KEY = "ms_user_id";
const UNAME_KEY = "ms_user_name";
const UEMAIL_KEY = "ms_user_email";
const USERS_KEY = "ms_users_v1"; // map: emailLower -> StoredUser

/* ------------- User DB ------------- */
function loadUsers(): Record<string, StoredUser> {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    const obj = raw ? JSON.parse(raw) : {};
    return obj && typeof obj === "object" ? obj : {};
  } catch {
    return {};
  }
}
function saveUsers(map: Record<string, StoredUser>) {
  localStorage.setItem(USERS_KEY, JSON.stringify(map));
}

/* ------------- Auth state ------------- */
export function getCurrentUser(): LocalUser | null {
  try {
    const id = localStorage.getItem(UID_KEY);
    const name = localStorage.getItem(UNAME_KEY);
    const email = localStorage.getItem(UEMAIL_KEY);
    if (!id || !name || !email) return null;
    return { id, name, email };
  } catch {
    return null;
  }
}

export function setCurrentUser(u: LocalUser) {
  localStorage.setItem(UID_KEY, u.id);
  localStorage.setItem(UNAME_KEY, u.name);
  localStorage.setItem(UEMAIL_KEY, u.email);
  window.dispatchEvent(new Event("ms:auth"));
}

export function signOut() {
  localStorage.removeItem(UID_KEY);
  localStorage.removeItem(UNAME_KEY);
  localStorage.removeItem(UEMAIL_KEY);
  window.dispatchEvent(new Event("ms:auth"));
}

/* ------------- Utilities ------------- */
export function norm(v: string) {
  return String(v || "").trim().toLowerCase().replace(/[-_]+/g, " ").replace(/\s+/g, " ");
}
export function isMe(displayName: string) {
  const u = getCurrentUser();
  return !!u && norm(u.name) === norm(displayName);
}
export function nsKey(suffix: string) {
  const u = getCurrentUser();
  if (!u) return `ms_u:anon:${suffix}`; // read-safe; write operations should *enforce* auth in UI
  return `ms_u:${u.id}:${suffix}`;
}

export async function hashPassword(pw: string): Promise<string> {
  const bytes = new TextEncoder().encode(pw);
  const buf = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/* ------------- Register / Login ------------- */
export async function registerUser(name: string, email: string, password: string): Promise<LocalUser> {
  const emailLower = email.trim().toLowerCase();
  const users = loadUsers();
  if (users[emailLower]) throw new Error("An account already exists for this email.");
  const id = `user_${crypto.randomUUID()}`;
  const passwordHash = await hashPassword(password);
  const stored: StoredUser = { id, name: name.trim(), email: emailLower, passwordHash };
  users[emailLower] = stored;
  saveUsers(users);
  const local: LocalUser = { id, name: stored.name, email: stored.email };
  setCurrentUser(local);
  return local;
}

export async function loginWithEmail(email: string, password: string): Promise<LocalUser> {
  const emailLower = email.trim().toLowerCase();
  const users = loadUsers();
  const u = users[emailLower];
  if (!u) throw new Error("No account found for that email.");
  const attempt = await hashPassword(password);
  if (attempt !== u.passwordHash) throw new Error("Incorrect password.");
  const local: LocalUser = { id: u.id, name: u.name, email: u.email };
  setCurrentUser(local);
  return local;
}
