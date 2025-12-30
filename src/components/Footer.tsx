"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { isAdmin } from "@/lib/admin";

export default function Footer() {
  const [isAdminUser, setIsAdminUser] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      const admin = await isAdmin();
      console.log('[Footer] Admin check result:', admin);
      setIsAdminUser(admin);
      console.log('[Footer] isAdminUser state set to:', admin);
    };
    checkAdmin();
    
    // Re-check when auth changes
    const onAuth = () => checkAdmin();
    window.addEventListener("ms:auth", onAuth as EventListener);
    return () => window.removeEventListener("ms:auth", onAuth as EventListener);
  }, []);

  return (
    <footer className="bg-white border-t border-gray-200 mt-12">
      <div className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Brand */}
        <div>
          <Link
            href="/"
            aria-label="Motorsource home"
            className="inline-flex items-center"
          >
            <img
              src="/images/MSlogoreal.png"
              alt="Motorsource"
              className="h-20 w-auto"
              loading="lazy"
            />
          </Link>
          <p className="mt-2 text-sm text-gray-600">
            Buy and sell automotive parts with confidence.
          </p>
        </div>

        {/* Quick Links */}
        <div>
          <h3 className="text-sm font-semibold text-black mb-3">Quick Links</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li><Link href="/categories/oem" className="hover:text-yellow-500">OEM Parts</Link></li>
            <li><Link href="/categories/aftermarket" className="hover:text-yellow-500">Aftermarket Parts</Link></li>
            <li><Link href="/registration" className="hover:text-yellow-500">Search by Registration</Link></li>
            <li><Link href="/categories/vin" className="hover:text-yellow-500">VIN Lookup</Link></li>
            <li><Link href="/categories/tools" className="hover:text-yellow-500">Tools & Accessories</Link></li>
          </ul>
        </div>

        {/* Info */}
        <div>
          <h3 className="text-sm font-semibold text-black mb-3">Info</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li><Link href="/about" className="hover:text-yellow-500">About Us</Link></li>
            <li><Link href="/contact" className="hover:text-yellow-500">Contact</Link></li>
            <li><Link href="/privacy" className="hover:text-yellow-500">Privacy Policy</Link></li>
            <li><Link href="/terms" className="hover:text-yellow-500">Terms of Service</Link></li>
            {isAdminUser && (
              <li>
                <Link 
                  href="/admin/dashboard" 
                  className="hover:text-yellow-500 font-semibold text-yellow-600"
                >
                  Admin Tools
                </Link>
              </li>
            )}
          </ul>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-gray-200 py-4 text-center text-sm text-gray-500">
        © {new Date().getFullYear()} Motorsource. All rights reserved.
      </div>
    </footer>
  );
}
