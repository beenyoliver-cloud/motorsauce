// src/components/Header.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  PlusCircle,
  User,
  Search as SearchIcon,
  ChevronDown,
  Menu,
  X,
  ShoppingCart,
  MessageSquare,
  Tag,
} from "lucide-react";
import { getCurrentUser, LocalUser, nsKey } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { supabaseBrowser } from "@/lib/supabase";
import CartDrawer from "@/components/CartDrawer";
import SearchBar from "@/components/SearchBar";
import { NotificationsDropdown } from "@/components/NotificationsDropdown";

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
  const [isUserLoaded, setIsUserLoaded] = useState(false);
  const [isAdminUser, setIsAdminUser] = useState(false);

  const categories = [
    ["OEM Parts", "/categories/oem"],
    ["Aftermarket Parts", "/categories/aftermarket"],
    ["Compatibility Search", "/categories/compatibility"],
    ["Search by Registration", "/registration"],
    ["Tools & Accessories", "/categories/tools"],
  ] as const;

  // Auth
  useEffect(() => {
    const refreshUser = async () => {
      const currentUser = await getCurrentUser();
      console.log('[Header] User loaded:', currentUser?.email);
      setUser(currentUser);
      setIsUserLoaded(true);
      if (currentUser) {
        // Check admin status
        const admin = await isAdmin();
        console.log('[Header] Admin status result:', admin);
        setIsAdminUser(admin);
        console.log('[Header] isAdminUser state set to:', admin);
      } else {
        setIsAdminUser(false);
      }
    };
    refreshUser();
    window.addEventListener("ms:auth", refreshUser as EventListener);
    return () => window.removeEventListener("ms:auth", refreshUser as EventListener);
  }, []);

  // Avatar - sync from user object and localStorage
  useEffect(() => {
    const refreshAvatar = () => {
      // Prioritize user.avatar from database, fallback to localStorage
      const dbAvatar = user?.avatar;
      const localAvatar = readAvatar();
      setAvatar(dbAvatar || localAvatar);
    };
    refreshAvatar();
    window.addEventListener("ms:profile", refreshAvatar as EventListener);
    window.addEventListener("ms:auth", refreshAvatar as EventListener);
    return () => {
      window.removeEventListener("ms:profile", refreshAvatar as EventListener);
      window.removeEventListener("ms:auth", refreshAvatar as EventListener);
    };
  }, [user]);

  // Real-time unread updates via Supabase + fallback polling
  useEffect(() => {
    let abort = false;
    let debounceTimer: NodeJS.Timeout | null = null;
    const supabase = supabaseBrowser();

    async function fetchUnreadImmediate() {
      try {
        console.log("[Header] Fetching unread count...");
        // Get auth token for API call
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          console.warn("[Header] No auth session, skipping unread count");
          return;
        }
        
        const res = await fetch("/api/messages/unread-count", { 
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });
        if (!res.ok) {
          console.warn("[Header] Unread count fetch failed:", res.status);
          return;
        }
        const data = await res.json();
        const n = Number(data?.count || 0);
        console.log("[Header] Unread count received:", n);
        if (!Number.isFinite(n)) return;
        if (!abort) {
          setUnread(n);
          console.log("[Header] Badge updated to:", n);
          try {
            localStorage.setItem(nsKey("unread_count"), String(n));
            window.dispatchEvent(new Event("ms:unread"));
          } catch {}
        }
      } catch (err) {
        console.error("[Header] Error fetching unread:", err);
      }
    }

    // Debounced version to prevent rapid consecutive calls
    function fetchUnread() {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        fetchUnreadImmediate();
      }, 500); // 500ms debounce
    }

    // Fetch immediately on mount
    fetchUnread();

    // Listen for manual event dispatches (from markThreadRead, etc.)
    window.addEventListener("ms:unread", fetchUnread as EventListener);
    window.addEventListener("ms:auth", fetchUnread as EventListener);

    // Subscribe to real-time changes for immediate updates
    const channel = supabase
      .channel("header-unread")
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "thread_read_status" },
        (payload) => {
          console.log("[Header] Real-time: thread marked UNREAD (DELETE)", payload);
          fetchUnread();
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "thread_read_status" },
        (payload) => {
          console.log("[Header] Real-time: thread marked READ (INSERT)", payload);
          fetchUnread();
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "thread_read_status" },
        (payload) => {
          console.log("[Header] Real-time: thread read status UPDATED (UPDATE)", payload);
          fetchUnread();
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          console.log("[Header] Real-time: new message inserted", payload);
          fetchUnread();
        }
      )
      .subscribe((status) => {
        console.log("[Header] Subscription status:", status);
      });

    // Fallback polling every 30 seconds (real-time handles most updates)
    const timerId = window.setInterval(fetchUnread, 30000);

    return () => {
      abort = true;
      if (debounceTimer) clearTimeout(debounceTimer);
      window.clearInterval(timerId);
      window.removeEventListener("ms:unread", fetchUnread as EventListener);
      window.removeEventListener("ms:auth", fetchUnread as EventListener);
      try { supabase.removeChannel(channel); } catch {}
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

   // Open cart drawer on custom event
   useEffect(() => {
     const handleOpenCart = () => setCartOpen(true);
     window.addEventListener("ms:opencart", handleOpenCart as EventListener);
     return () => window.removeEventListener("ms:opencart", handleOpenCart as EventListener);
   }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  const displayName = useMemo(() => getDisplayName(user), [user]);
  const initials = useMemo(() => getInitials(displayName), [displayName]);
  const profileHref = user ? `/profile/${encodeURIComponent(user.name)}` : "/auth/login";

  const profileLinks = [
    ["My Profile", profileHref],
     ["My Orders", "/orders"],
    ["My Offers", "/offers-standalone"],
    ["Saved Searches", "/saved-searches"],
    ["My Messages", "/messages"],
    ["Previous Sales", "/sales"],
    ["My Reviews", "/reviews"],
    ["Account Settings", "/settings"],
  ] as const;

  return (
    <>
      {/* Mobile header (md:hidden) - Compact two-row design */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        {/* Top row: Menu, Logo, Icons */}
        <div className="h-11 flex items-center justify-between px-2">
          {/* Left: Menu button */}
          <button
            className="flex items-center justify-center text-black hover:text-yellow-500 w-9 h-9"
            aria-label="Toggle menu"
            onClick={() => setMobileMenuOpen((v) => !v)}
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>

          {/* Center: Logo */}
          <Link href="/" aria-label="Motorsource home" className="absolute left-1/2 -translate-x-1/2">
            <img
              src="/images/MSlogoreal.png"
              alt="Motorsauce"
              className="h-[28px] w-auto"
            />
          </Link>

          {/* Right: Notifications, Profile, Cart - tight spacing */}
          <div className="flex items-center">
            {isUserLoaded && user && (
              <>
                <NotificationsDropdown />
                <Link
                  href={profileHref}
                  aria-label="Profile"
                  className="flex items-center justify-center text-black hover:text-yellow-500 w-8 h-9"
                >
                  <User size={20} />
                </Link>
              </>
            )}
            <Link
              href="/basket"
              aria-label="Open basket"
              className="relative flex items-center justify-center text-black hover:text-yellow-500 w-8 h-9"
            >
              <ShoppingCart size={20} />
              {cartCount > 0 && (
                <span className="absolute top-0.5 right-0 inline-flex items-center justify-center rounded-full bg-yellow-500 text-black text-[9px] font-bold min-w-[15px] h-[15px] px-0.5">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Search bar - always visible */}
        <div className="px-2 pb-2">
          <SearchBar placeholder="Search parts or sellers…" compact />
        </div>
      </div>

      {/* Mobile menu backdrop and panel - OUTSIDE the header div to fix stacking context */}
      {mobileMenuOpen && (
        <div className="md:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/30 z-[100]"
            onClick={() => setMobileMenuOpen(false)}
          />
          {/* Menu panel */}
          <div className="fixed inset-0 bg-white z-[110] overflow-y-auto flex flex-col">
            {/* Menu Header with Logo and Close */}
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between shrink-0">
              <Link href="/" aria-label="Motorsource home">
                <img
                  src="/images/MSlogoreal.png"
                  alt="Motorsauce"
                  className="h-[34px] w-auto"
                />
              </Link>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 -mr-2 rounded-md hover:bg-gray-100 transition text-black"
                aria-label="Close menu"
              >
                <X size={22} />
              </button>
            </div>

            {/* Quick access bar for logged-in users */}
            {isUserLoaded && user && (
              <div className="flex items-center justify-around py-3 px-4 bg-gray-50 border-b border-gray-200">
                <Link
                  href={profileHref}
                  className="flex flex-col items-center gap-1 text-gray-600 hover:text-yellow-600"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <User size={20} />
                  <span className="text-xs">Profile</span>
                </Link>
                <Link
                  href="/messages"
                  className="relative flex flex-col items-center gap-1 text-gray-600 hover:text-yellow-600"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <div className="relative">
                    <MessageSquare size={20} />
                    {unread > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 inline-flex items-center justify-center rounded-full bg-yellow-500 text-black text-[9px] font-bold min-w-[16px] h-[16px] px-0.5">
                        {unread > 9 ? '9+' : unread}
                      </span>
                    )}
                  </div>
                  <span className="text-xs">Messages</span>
                </Link>
                <Link
                  href="/offers-standalone"
                  className="flex flex-col items-center gap-1 text-gray-600 hover:text-yellow-600"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Tag size={20} />
                  <span className="text-xs">Offers</span>
                </Link>
                <Link
                  href="/sell"
                  className="flex flex-col items-center gap-1 text-gray-600 hover:text-yellow-600"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <PlusCircle size={20} />
                  <span className="text-xs">Sell</span>
                </Link>
              </div>
            )}

            {/* Menu Content */}
            <nav className="flex flex-col flex-1">
              <Link
                href="/"
                className="block px-4 py-3 text-sm font-semibold text-yellow-600 hover:bg-yellow-50 border-b border-gray-200"
                onClick={() => setMobileMenuOpen(false)}
              >
                Home
              </Link>
              {categories.map(([name, href]) => (
                <Link
                  key={href}
                  href={href}
                  className="block px-4 py-3 text-sm text-black hover:bg-yellow-50 hover:text-yellow-600 border-b border-gray-100"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {name}
                </Link>
              ))}
              <div className="border-t border-gray-200" />
              {isUserLoaded && user ? (
                <>
                  <Link
                    href="/sell"
                    className="block px-4 py-2 text-sm text-black hover:bg-yellow-50 hover:text-yellow-600"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span className="inline-flex items-center gap-1">
                      <PlusCircle size={16} /> Sell
                    </span>
                  </Link>
                  {isAdminUser && (
                    <Link
                      href="/admin/dashboard"
                      className="block px-4 py-2 text-sm text-black hover:bg-yellow-50 hover:text-yellow-600"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <span className="inline-flex items-center gap-1">
                        <User size={16} /> Admin
                      </span>
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setCartOpen(true);
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-black hover:bg-yellow-50 hover:text-yellow-600"
                  >
                    <span className="inline-flex items-center gap-1">
                      <ShoppingCart size={16} /> Basket {cartCount > 0 ? `(${cartCount})` : ""}
                    </span>
                  </button>
                  <Link
                    href={profileHref}
                    className="block px-4 py-2 text-sm text-black hover:bg-yellow-50 hover:text-yellow-600"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    My Profile
                  </Link>
                  <Link
                    href="/messages"
                    className="block px-4 py-2 text-sm text-black hover:bg-yellow-50 hover:text-yellow-600"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    My Messages {unread > 0 ? `(${unread})` : ""}
                  </Link>
                  <Link
                    href="/offers-standalone"
                    className="block px-4 py-2 text-sm text-black hover:bg-yellow-50 hover:text-yellow-600"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    My Offers
                  </Link>
                  <Link
                    href="/sales"
                    className="block px-4 py-2 text-sm text-black hover:bg-yellow-50 hover:text-yellow-600"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Previous Sales
                  </Link>
                  <Link
                    href="/reviews"
                    className="block px-4 py-2 text-sm text-black hover:bg-yellow-50 hover:text-yellow-600"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    My Reviews
                  </Link>
                  <Link
                    href="/settings"
                    className="block px-4 py-2 text-sm text-black hover:bg-yellow-50 hover:text-yellow-600"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Account Settings
                  </Link>
                  <Link
                    href="/auth/logout"
                    className="block w-full text-left px-4 py-2 text-sm text-black hover:bg-yellow-50 hover:text-yellow-600"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Log out
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/basket"
                    className="block w-full text-left px-4 py-2 text-sm text-black hover:bg-yellow-50 hover:text-yellow-600"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span className="inline-flex items-center gap-1">
                      <ShoppingCart size={16} /> Basket {cartCount > 0 ? `(${cartCount})` : ""}
                    </span>
                  </Link>
                  <div className="border-t border-gray-100" />
                  <Link
                    href="/auth/login"
                    className="block px-4 py-2 text-sm font-semibold text-black hover:bg-yellow-50 hover:text-yellow-600"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/auth/register"
                    className="block px-4 py-2 text-sm font-semibold text-black hover:bg-yellow-50 hover:text-yellow-600"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Register
                  </Link>
                </>
              )}
            </nav>
          </div>
        </div>
      )}

      {/* Desktop header (>= md) */}
      <nav className="hidden md:flex w-full h-[64px] bg-white border-b border-gray-200 items-center justify-between px-6 shadow-sm fixed top-0 z-40">
        <Link href="/" aria-label="Motorsauce home" className="flex-shrink-0">
          <img
            src="/images/MSlogoreal.png"
            alt="Motorsauce"
            className="h-[42px] w-auto"
          />
        </Link>

      <div className="flex-1 flex justify-center px-4" role="search">
        <div className="w-full max-w-2xl">
          <SearchBar placeholder="Search parts or sellers…" compact />
        </div>
      </div>

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

          {isUserLoaded && user && (
          <Link
            href="/sell"
            className="flex items-center gap-1 text-sm font-medium text-black hover:text-yellow-500 transition-colors"
          >
            <PlusCircle size={16} /> Sell
          </Link>
        )}
        {isUserLoaded && isAdminUser && (
          <Link
            href="/admin/dashboard"
            className="flex items-center gap-1 text-sm font-medium text-black hover:text-yellow-500 transition-colors bg-yellow-100 px-2 py-1 rounded"
          >
            Admin
          </Link>
        )}
        {isUserLoaded && user && (
            <>
              <NotificationsDropdown />
          <Link
            href="/messages"
            className="relative flex items-center text-black hover:text-yellow-500 transition-colors"
            aria-label="Messages"
          >
                <MessageSquare size={20} />
            {unread > 0 && (
              <span className="absolute -top-2 -right-3 inline-flex items-center justify-center rounded-full bg-yellow-500 text-black text-[11px] font-bold min-w-[18px] h-[18px] px-1">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </Link>
            </>
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
              {isUserLoaded && user && avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatar} alt="" className="site-image" />
              ) : (
                <div className="h-full w-full bg-yellow-500 text-black flex items-center justify-center text-xs font-semibold">
                  {isUserLoaded && user ? initials : <User size={18} />}
                </div>
              )}
            </div>
            <span className="text-sm font-medium text-black">
              {isUserLoaded && user ? displayName : "Sign in"}
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
            {isUserLoaded && user ? (
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
                        {unread > 9 ? '9+' : unread}
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

      {/* Cart drawer - desktop only (mobile navigates to /basket page) */}
      <div className="hidden md:block">
        <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
      </div>
    </nav>
    </>
  );
}
