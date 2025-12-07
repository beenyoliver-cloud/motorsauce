// src/components/SellFAB.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";

/**
 * Floating Action Button for "Sell" - Mobile only
 * Shows a prominent yellow circular button in the bottom-right corner
 * Only visible on mobile when user is logged in
 */
export default function SellFAB() {
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

  if (!show) return null;

  return (
    <Link
      href="/sell"
      className={`
        md:hidden fixed bottom-6 right-6 z-40
        flex flex-col items-center justify-center gap-1
        bg-yellow-500 text-black
        rounded-full shadow-lg hover:shadow-xl
        transition-all duration-300 ease-out
        ${isScrolled ? 'scale-95' : 'scale-100'}
        hover:scale-105 active:scale-95
        group
      `}
      style={{
        width: '64px',
        height: '64px',
      }}
      aria-label="Sell your parts"
    >
      <PlusCircle 
        size={28} 
        className="text-black group-hover:rotate-90 transition-transform duration-300" 
        strokeWidth={2.5}
      />
      <span className="text-[10px] font-bold uppercase tracking-wide">
        Sell
      </span>
      
      {/* Pulse animation ring */}
      <span className="absolute inset-0 rounded-full bg-yellow-500 animate-ping opacity-20" />
    </Link>
  );
}
