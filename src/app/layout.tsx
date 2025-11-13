// src/app/layout.tsx
import "./globals.css";
import Header from "@/components/Header";
import MobileTabBar from "@/components/MobileTabBar";
import Footer from "@/components/Footer";
import type { ReactNode } from "react";
// Removed unused import
// We need a small client wrapper for the tab bar to fetch current user name
// Keep this tiny client island inside layout without converting full layout to client.
// We avoid type arguments on require calls by using standard React import dynamically.
// Client wrapper moved to its own file to avoid SSR hook usage inside the server layout.
import MobileNavWrapper from "@/components/MobileNavWrapper";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-gray-900 pb-14 md:pb-0">
        <Header />
        {/* Offset for fixed header: larger on mobile (custom ~120px), default 56px on md+ */}
        <div className="pt-[128px] md:pt-14">
          {children}
          <Footer />
        </div>
        {/* Mobile persistent tab bar */}
        <MobileNavWrapper />
      </body>
    </html>
  );
}
