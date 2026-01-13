// src/components/SellFAB.tsx
"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";

/**
 * Floating Action Button for "Sell" - Mobile only
 * Shows a prominent yellow circular button in the bottom-right corner
 * Only visible on mobile when user is logged in and on the home page
 */
export default function SellFAB() {
  const pathname = usePathname();
  const [show, setShow] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    // Check if user is logged in
    const checkUser = async () => {
      const user = await getCurrentUser();
      setShow(!!user);
    };
    checkUser();

    // Listen for auth changes
    const handleAuth = () => checkUser();
    window.addEventListener("ms:auth", handleAuth as EventListener);
    return () => window.removeEventListener("ms:auth", handleAuth as EventListener);
  }, []);

  useEffect(() => {
    // Add subtle animation on scroll
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 100);
    };
    
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Only show on home page (mobile) when user is logged in
  const isHomePage = pathname === "/";
  if (!show || !isHomePage) return null;

  return (
    <Link
      href="/sell"
      className={`
        md:hidden fixed z-40
        flex items-center justify-center gap-2 px-5 py-3
        bg-yellow-500 text-black
        rounded-full shadow-lg hover:shadow-xl
        transition-all duration-300 ease-out
        ${isScrolled ? 'scale-95' : 'scale-100'}
        hover:scale-105 active:scale-95
        group
      `}
      style={{
        bottom: "calc(1.5rem + env(safe-area-inset-bottom))",
        right: "calc(1.5rem + env(safe-area-inset-right))",
      }}
      aria-label="Sell your parts"
    >
      <PlusCircle 
        size={20} 
        className="text-black group-hover:rotate-90 transition-transform duration-300" 
        strokeWidth={2.5}
      />
      <span className="text-sm font-bold uppercase tracking-wide">
        Sell
      </span>
      
      {/* Pulse animation ring */}
      <span className="absolute inset-0 rounded-full bg-yellow-500 animate-ping opacity-20" />
    </Link>
  );
}
