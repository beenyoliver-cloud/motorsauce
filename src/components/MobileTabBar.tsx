"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, PlusCircle, MessageSquare, User, ShoppingCart } from "lucide-react";
import { useEffect, useState } from "react";
import { nsKey } from "@/lib/auth";

function readUnread(): number {
  if (typeof window === "undefined") return 0;
  const raw = localStorage.getItem(nsKey("unread_count"));
  const n = raw ? parseInt(raw, 10) : 0;
  return Number.isFinite(n) ? n : 0;
}
function readCart(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem("ms:cart:v1");
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as { items?: { qty?: number }[] };
    return (parsed.items || []).reduce((sum, i) => sum + (i.qty || 0), 0);
  } catch { return 0; }
}

export default function MobileTabBar({ currentUser }: { currentUser?: string | null }) {
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    const update = () => setUnread(readUnread());
    update();
    window.addEventListener("ms:unread", update as EventListener);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener("ms:unread", update as EventListener);
      window.removeEventListener("storage", update);
    };
  }, []);
  useEffect(() => {
    const updateCart = () => setCartCount(readCart());
    updateCart();
    window.addEventListener("ms:cart", updateCart as EventListener);
    window.addEventListener("storage", updateCart);
    return () => {
      window.removeEventListener("ms:cart", updateCart as EventListener);
      window.removeEventListener("storage", updateCart);
    };
  }, []);

  const items: Array<{ href: string; label: string; icon: React.ReactNode; badge?: number; exact?: boolean }> = [
    { href: "/", label: "Home", icon: <Home size={20} /> , exact: true },
    { href: "/search", label: "Search", icon: <Search size={20} /> },
    { href: "/sell", label: "Sell", icon: <PlusCircle size={20} /> },
    { href: "/messages", label: "Msgs", icon: <MessageSquare size={20} />, badge: unread },
    { href: currentUser ? `/profile/${encodeURIComponent(currentUser)}` : "/auth/login", label: "Me", icon: <User size={20} /> },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white border-t border-gray-200 shadow-sm">
      <div className="grid grid-cols-5">
        {items.map(it => {
          const active = it.exact ? pathname === it.href : pathname.startsWith(it.href);
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`relative flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium ${active ? "text-yellow-600" : "text-gray-700"}`}
              aria-label={it.label}
            >
              <div className="relative">
                {it.icon}
                {it.badge && it.badge > 0 && (
                  <span className="absolute -top-1 -right-2 rounded-full bg-yellow-500 text-black text-[10px] font-bold px-1 min-w-[16px] h-[16px] flex items-center justify-center">
                    {it.badge}
                  </span>
                )}
              </div>
              {it.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
