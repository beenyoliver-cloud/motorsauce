// src/app/layout.tsx
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SellFAB from "@/components/SellFAB";
import { LayoutClient } from "@/components/LayoutClient";
import WarningBanner from "@/components/WarningBanner";
import type { ReactNode } from "react";
import { Analytics } from "@vercel/analytics/react";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-gray-900">
        <Header />
        {/* Offset for fixed header + categories rail */}
        <div className="layout-offset">
          {/* Warning banner for users with active warnings */}
          <WarningBanner />
          <LayoutClient>
            {children}
            <Footer />
          </LayoutClient>
        </div>
        {/* Floating Action Button for Sell - Mobile Only */}
        <SellFAB />
        {/* Vercel Analytics */}
        <Analytics />
      </body>
    </html>
  );
}
