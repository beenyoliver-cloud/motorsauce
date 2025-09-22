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
        {/* Add top padding equal to header height (h-14 => 56px) */}
        <div className="pt-14">
          {children}
          <Footer />
        </div>
      </body>
    </html>
  );
}
