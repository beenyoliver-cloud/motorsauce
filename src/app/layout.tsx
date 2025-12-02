// src/app/layout.tsx
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import type { ReactNode } from "react";
import { Analytics } from "@vercel/analytics/react";
// Removed unused import
// We need a small client wrapper for the tab bar to fetch current user name
// Keep this tiny client island inside layout without converting full layout to client.
// We avoid type arguments on require calls by using standard React import dynamically.
// Client wrapper moved to its own file to avoid SSR hook usage inside the server layout.
// Mobile bottom tab bar removed; hamburger menu handles nav on mobile

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-gray-900">
        <Header />
        {/* Offset for fixed header: larger on mobile (custom ~120px), default 56px on md+ */}
        <div className="pt-[128px] md:pt-14">
          {children}
          <Footer />
        </div>
        {/* Vercel Analytics */}
        <Analytics />
      </body>
    </html>
  );
}
