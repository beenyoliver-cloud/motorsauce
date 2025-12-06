// src/app/layout.tsx
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { LayoutClient } from "@/components/LayoutClient";
import type { ReactNode } from "react";
import { Analytics } from "@vercel/analytics/react";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-gray-900">
        <Header />
        {/* Offset for fixed header: larger on mobile (custom ~120px), default 56px on md+ */}
        <div className="pt-[128px] md:pt-14">
          <LayoutClient>
            {children}
            <Footer />
          </LayoutClient>
        </div>
        {/* Vercel Analytics */}
        <Analytics />
      </body>
    </html>
  );
}
