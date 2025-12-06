// src/components/AdminNav.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Flag, FileText, ChevronRight, Shield } from "lucide-react";

const navItems = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/reports", label: "Reports", icon: Flag },
  { href: "/admin/listings", label: "Listings", icon: FileText },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
        <Shield className="text-yellow-600" size={20} />
        <span className="font-semibold text-gray-900">Admin Tools</span>
      </div>
      <nav className="flex flex-wrap gap-2">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? "bg-yellow-500 text-black shadow-sm"
                  : "bg-gray-50 text-gray-700 hover:bg-yellow-50 hover:text-yellow-700 border border-gray-200"
              }`}
            >
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function AdminBreadcrumb({ current }: { current: string }) {
  return (
    <nav className="flex items-center gap-2 text-sm text-gray-600 mb-4">
      <Link href="/" className="hover:text-yellow-600 transition">
        Home
      </Link>
      <ChevronRight size={14} className="text-gray-400" />
      <Link href="/admin/dashboard" className="hover:text-yellow-600 transition">
        Admin
      </Link>
      <ChevronRight size={14} className="text-gray-400" />
      <span className="text-gray-900 font-medium">{current}</span>
    </nav>
  );
}
