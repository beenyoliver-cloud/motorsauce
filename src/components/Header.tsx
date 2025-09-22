// src/components/Header.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  PlusCircle,
  User,
  Search as SearchIcon,
  ChevronDown,
  Menu,
  X,
  ShoppingCart,
} from "lucide-react";
import { getCurrentUser, LocalUser, nsKey } from "@/lib/auth";
import CartDrawer from "@/components/CartDrawer";

/* ===== Helpers ===== */
function readUnreadCount(): number {
  if (typeof window === "undefined") return 0;
  const key = nsKey("unread_count");
  const v = window.localStorage.getItem(key);
  const n = v ? parseInt(v, 10) : NaN;
  return Number.isFinite(n) ? n : 0;
}
function readAvatar(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(nsKey("avatar_v1")) || null;
  } catch {
    return null;
  }
}
function getDisplayName(u: LocalUser | null): string {
  if (!u) return "Account";
  return u.name?.trim() || "Account";
}
function getInitials(label: string): string {
  const s = label.trim();
  if (!s) return "U";
  const parts = s.split(/\s+/);
  return parts.length === 1
    ? (s[0] + (s[s.length - 1] || "")).toUpperCase()
    : (parts[0][0] + parts[1][0]).toUpperCase();
}

/** Basket helpers */
function readCartCount(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem("ms:cart:v1");
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as { items?: { qty?: number }[] } | null;
    const items = Array.isArray(parsed?.items) ? parsed!.items : [];
    return items.reduce((sum, i) => sum + (i.qty || 0), 0);
  } catch {
    return 0;
  }
}

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [user, setUser] = useState<LocalUser | null>(null);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [cartCount, setCartCount] = useState(0);
  const [cartOpen, setCartOpen] = useState(false);

  const categories = [
    ["OEM Parts", "/categories/oem"],
    ["Aftermarket Parts", "/categories/aftermarket"],
    ["Compatibility Search", "/categories/compatibility"],
    ["Search by Registration", "/registration"],
    ["Tools & Accessories", "/categories/tools"],
  ] as const;

  // Auth
  useEffect(() => {
    const refreshUser = () => setUser(getCurrentUser());
    refreshUser();
    window.addEventListener("ms:auth", refreshUser as EventListener);
    return () => window.removeEventListener("ms:auth", refreshUser as EventListener);
  }, []);

  // Avatar
  useEffect(() => {
    const refreshAvatar = () => setAvatar(readAvatar());
    refreshAvatar();
    window.addEventListener("ms:profile", refreshAvatar as EventListener);
    window.addEventListener("ms:auth", refreshAvatar as EventListener);
    return () => {
      window.removeEventListener("ms:profile", refreshAvatar as EventListener);
      window.removeEventListener("ms:auth", refreshAvatar as EventListener);
    };
  }, [user]);

  // Unread
  useEffect(() => {
    const update = () => setUnread(readUnreadCount());
    update();
    window.addEventListener("storage", update);
    window.addEventListener("ms:unread", update as EventListener);
    window.addEventListener("ms:auth", update as EventListener);
    return () => {
      window.removeEventListener("storage", update);
      window.removeEventListener("ms:unread", update as EventListener);
      window.removeEventListener("ms:auth", update as EventListener);
    };
  }, []);

  // Cart
  useEffect(() => {
    const updateCart = () => setCartCount(readCartCount());
    updateCart();
    window.addEventListener("ms:cart", updateCart as EventListener);
    window.addEventListener("storage", updateCart);
    return () => {
      window.removeEventListener("ms:cart", updateCart as EventListener);
      window.removeEventListener("storage", updateCart);
    };
  }, []);

  const displayName = useMemo(() => getDisplayName(user), [user]);
  const initials = useMemo(() => getInitials(displayName), [displayName]);
  const profileHref = user ? `/profile/${encodeURIComponent(user.name)}` : "/auth/login";

  const profileLinks = [
    ["My Profile", profileHref],
    ["My Messages", "/messages"],
    ["Previous Sales", "/sales"],
    ["My Reviews", "/reviews"],
  ] as const;

  return (
    <nav className="w-full h-[55px] bg-white border-b border-gray-200 flex items-center justify-between px-6 shadow-sm fixed top-0 z-50">
      <Link href="/" className="text-2xl font-extrabold text-yellow-500 tracking-tight">
        Motorsauce
      </Link>

      <form
        action="/search"
        method="get"
        className="flex-1 flex justify-center px-4"
        role="search"
      >
        <div className="flex items-center w-full max-w-xl border border-gray-300 rounded-full px-4 py-1 focus-within:ring-2 focus-within:ring-yellow-400 bg-white shadow-sm">
          <SearchIcon className="text-gray-400 mr-2" size={18} aria-hidden="true" />
          <input
            type="text"
            name="query"
            placeholder="Search parts or enter registration…"
            className="flex-1 border-none focus:ring-0 text-[15px] text-[#333] placeholder-gray-800 bg-transparent"
            aria-label="Search"
          />
        </div>
      </form>

      <div className="hidden md:flex items-center gap-4">
        {/* Categories dropdown */}
        <div className="relative group">
          <button
            type="button"
            className="flex items-center gap-1 text-sm font-medium text-black hover:text-yellow-500 transition-colors"
          >
            Categories <ChevronDown size={14} className="mt-[1px]" aria-hidden="true" />
          </button>
          <div
            className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-md shadow-lg opacity-0 invisible
                       group-hover:visible group-hover:opacity-100 transform -translate-y-2 group-hover:translate-y-0
                       transition-all duration-200 ease-out z-50"
            role="menu"
          >
            {categories.map(([name, href], index) => (
              <Link
                key={href}
                href={href}
                style={{ transitionDelay: `${index * 50}ms` }}
                className="block px-4 py-2 text-sm text-black hover:bg-yellow-50 hover:text-yellow-600 transition-all"
                role="menuitem"
              >
                {name}
              </Link>
            ))}
          </div>
        </div>

        {user && (
          <Link
            href="/sell"
            className="flex items-center gap-1 text-sm font-medium text-black hover:text-yellow-500 transition-colors"
          >
            <PlusCircle size={16} /> Sell
          </Link>
        )}

        <button
  onClick={() => setCartOpen(true)}
  className="relative flex items-center text-black hover:text-yellow-500 transition-colors"
  aria-label="Open basket"
>
  <ShoppingCart size={20} />
  {cartCount > 0 && (
    <span className="absolute -top-2 -right-3 inline-flex items-center justify-center rounded-full bg-yellow-500 text-black text-[11px] font-bold min-w-[18px] h-[18px] px-1">
      {cartCount}
    </span>
  )}
</button>

        {/* Profile with dropdown */}
        <div className="relative group">
          <Link href={profileHref} className="flex items-center gap-2 focus:outline-none">
            <div className="h-9 w-9 rounded-full ring-2 ring-yellow-500 ring-offset-2 ring-offset-white overflow-hidden shrink-0">
              {user && avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatar} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full bg-yellow-500 text-black flex items-center justify-center text-xs font-semibold">
                  {user ? initials : <User size={18} />}
                </div>
              )}
            </div>
            <span className="text-sm font-medium text-black">
              {user ? displayName : "Sign in"}
            </span>
            <ChevronDown size={14} className="text-gray-500" aria-hidden="true" />
          </Link>

          {/* ▼ Dropdown menu */}
          <div
            className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-md shadow-lg opacity-0 invisible
                       group-hover:visible group-hover:opacity-100 transform -translate-y-2 group-hover:translate-y-0
                       transition-all duration-200 ease-out z-50"
            role="menu"
          >
            {user ? (
              <>
                {profileLinks.map(([name, href], i) => (
                  <Link
                    key={href}
                    href={href}
                    style={{ transitionDelay: `${i * 50}ms` }}
                    className="flex items-center justify-between px-4 py-2 text-sm text-black hover:bg-yellow-50 hover:text-yellow-600 transition-all"
                    role="menuitem"
                  >
                    <span>{name}</span>
                    {name === "My Messages" && unread > 0 && (
                      <span className="ml-2 inline-flex items-center justify-center rounded-full bg-yellow-500 text-black text-xs font-bold px-2 py-0.5">
                        {unread}
                      </span>
                    )}
                  </Link>
                ))}
                <Link
                  href="/auth/logout"
                  className="block w-full text-left px-4 py-2 text-sm text-black hover:bg-yellow-50 hover:text-yellow-600"
                  role="menuitem"
                >
                  Log out
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="block px-4 py-2 text-sm text-black hover:bg-yellow-50 hover:text-yellow-600"
                  role="menuitem"
                >
                  Sign in
                </Link>
                <Link
                  href="/auth/register"
                  className="block px-4 py-2 text-sm text-black hover:bg-yellow-50 hover:text-yellow-600"
                  role="menuitem"
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile menu toggle */}
      <button
        className="md:hidden flex items-center"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        aria-label="Toggle menu"
      >
        {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {mobileMenuOpen && (
        <div className="md:hidden absolute top[55px] left-0 w-full bg-white border-b border-gray-200 shadow-md z-40">
          {categories.map(([name, href]) => (
            <Link
              key={href}
              href={href}
              className="block px-4 py-2 text-sm text-black hover:bg-yellow-50 hover:text-yellow-600"
            >
              {name}
            </Link>
          ))}
          <div className="border-t border-gray-100" />
          {user ? (
            <>
              <Link
                href="/sell"
                className="block px-4 py-2 text-sm text-black hover:bg-yellow-50 hover:text-yellow-600"
              >
                <span className="inline-flex items-center gap-1">
                  <PlusCircle size={16} /> Sell
                </span>
              </Link>
              <Link
                href="/basket"
                className="block px-4 py-2 text-sm text-black hover:bg-yellow-50 hover:text-yellow-600"
              >
                Basket {cartCount > 0 ? `(${cartCount})` : ""}
              </Link>
              <Link
                href={profileHref}
                className="block px-4 py-2 text-sm text-black hover:bg-yellow-50 hover:text-yellow-600"
              >
                My Profile
              </Link>
              <Link
                href="/messages"
                className="block px-4 py-2 text-sm text-black hover:bg-yellow-50 hover:text-yellow-600"
              >
                My Messages {unread > 0 ? `(${unread})` : ""}
              </Link>
              <Link
                href="/sales"
                className="block px-4 py-2 text-sm text-black hover:bg-yellow-50 hover:text-yellow-600"
              >
                Previous Sales
              </Link>
              <Link
                href="/reviews"
                className="block px-4 py-2 text-sm text-black hover:bg-yellow-50 hover:text-yellow-600"
              >
                My Reviews
              </Link>
              <Link
                href="/auth/logout"
                className="block w-full text-left px-4 py-2 text-sm text-black hover:bg-yellow-50 hover:text-yellow-600"
              >
                Log out
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/auth/login"
                className="block px-4 py-2 text-sm text-black hover:bg-yellow-50 hover:text-yellow-600"
              >
                Sign in
              </Link>
              <Link
                href="/auth/register"
                className="block px-4 py-2 text-sm text-black hover:bg-yellow-50 hover:text-yellow-600"
              >
                Register
              </Link>
            </>
          )}
        </div>
      )}
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </nav>
  );
}
