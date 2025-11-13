// src/app/layout.tsx
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import type { ReactNode } from "react";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-gray-900">
        <Header />
        {/* Offset for fixed header: larger on mobile (custom ~120px), default 56px on md+ */}
        <div className="pt-[120px] md:pt-14">
          {children}
          <Footer />
        </div>
      </body>
    </html>
  );
}
