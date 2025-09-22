"use client";

import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 mt-12">
      <div className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Brand */}
        <div>
          <Link href="/" className="text-2xl font-extrabold text-yellow-500 tracking-tight">
            Motorsauce
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
            <li><Link href="/categories/compatibility" className="hover:text-yellow-500">Compatibility Search</Link></li>
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
          </ul>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-gray-200 py-4 text-center text-sm text-gray-500">
        © {new Date().getFullYear()} Motorsauce. All rights reserved.
      </div>
    </footer>
  );
}
