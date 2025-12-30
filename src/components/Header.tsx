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

  const displayName = useMemo(() => getDisplayName(user), [user]);
  const initials = useMemo(() => getInitials(displayName), [displayName]);
  const profileHref = user ? `/profile/${encodeURIComponent(user.name)}` : "/auth/login";

  const profileLinks = [
    ["My Profile", profileHref],
    ["My Orders", "/orders"],
    ["My Reviews", "/reviews"],
    ["Drafts", `${profileHref}?tab=drafts`],
    ["Saved", `${profileHref}?tab=saved`],
    ["Saved Searches", "/saved-searches"],
    ["My Messages", "/messages"],
    ["Previous Sales", "/sales"],
    ["Account Settings", "/settings"],
  ] as const;

  return (
    <>
      <nav className="w-full bg-white border-b border-gray-200 shadow-sm fixed top-0 z-40">
        <div className="mx-auto max-w-6xl px-3 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4 py-2">
            {/* Left: Logo */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <Link href="/" aria-label="Motorsauce home" className="inline-flex items-center">
                <img
                  src="/images/MSlogoreal.png"
                  alt="Motorsauce"
                  className="h-12 w-auto object-contain"
                />
              </Link>
              <div className="relative group hidden sm:block">
                <button
                  type="button"
                  className="flex items-center gap-1 text-sm font-medium text-black hover:text-yellow-500 transition-colors"
                >
                  Categories <ChevronDown size={14} aria-hidden="true" />
                </button>
                <div
                  className="absolute left-0 mt-2 w-56 bg-white border border-gray-200 rounded-md shadow-lg opacity-0 invisible
                             group-hover:visible group-hover:opacity-100 transform -translate-y-2 group-hover:translate-y-0
                             transition-all duration-200 ease-out z-50"
                  role="menu"
                >
                  {categories.map(([name, href], index) => (
                    <Link
                      key={href}
                      href={href}
                      style={{ transitionDelay: `${index * 40}ms` }}
                      className="block px-4 py-2 text-sm text-black hover:bg-yellow-50 hover:text-yellow-600 transition-all"
                      role="menuitem"
                    >
                      {name}
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* Middle: Search */}
            <div className="flex-1 w-full" role="search">
              <div className="w-full max-w-3xl mx-auto">
                <SearchBar placeholder="Search parts or sellers…" compact />
              </div>
            </div>

            {/* Right actions */}
            <div className="flex items-center justify-end gap-5 flex-shrink-0">
              {isUserLoaded && user && (
                <Link
                  href="/sell"
                  className="hidden sm:inline-flex items-center gap-1 text-sm font-medium text-black hover:text-yellow-500 transition-colors"
                >
                  <PlusCircle size={16} /> Sell
                </Link>
              )}
              {isUserLoaded && isAdminUser && (
                <Link
                  href="/admin/dashboard"
                  className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold text-black hover:text-yellow-500 transition-colors bg-yellow-100 px-2 py-1 rounded"
                >
                  Admin
                </Link>
              )}
              {isUserLoaded && user && <NotificationsDropdown />}
              {isUserLoaded && user && (
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
              )}
              <button
                onClick={() => setCartOpen(true)}
                className="relative flex items-center text-black hover:text-yellow-500 transition-colors mr-2"
                aria-label="Open basket"
              >
                <ShoppingCart size={20} />
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-3 inline-flex items-center justify-center rounded-full bg-yellow-500 text-black text-[11px] font-bold min-w-[18px] h-[18px] px-1">
                    {cartCount > 9 ? '9+' : cartCount}
                  </span>
                )}
              </button>

              {/* Profile */}
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
                  <span className="text-sm font-medium text-black hidden sm:block">
                    {isUserLoaded && user ? displayName : "Sign in"}
                  </span>
                  <ChevronDown size={14} className="text-gray-500 hidden sm:block" aria-hidden="true" />
                </Link>

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
                          style={{ transitionDelay: `${i * 40}ms` }}
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
          </div>
        </div>

        {/* Cart drawer */}
        <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
      </nav>
    </>
  );
}
