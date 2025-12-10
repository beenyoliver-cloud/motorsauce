// src/components/ClassifiedsBanner.tsx
"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export default function ClassifiedsBanner() {
  return (
    <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2.5">
      <div className="max-w-6xl mx-auto flex flex-wrap items-center gap-2 text-sm">
        <AlertTriangle className="h-4 w-4 text-yellow-600 shrink-0" />
        <span className="text-gray-900 flex-1 min-w-0">
          <strong className="font-semibold">MotorSauce is a classifieds platform.</strong>
          {" "}Arrange payment and collection directly with sellers.
        </span>
        <Link 
          href="/safety-tips" 
          className="text-yellow-700 hover:text-yellow-800 font-medium hover:underline whitespace-nowrap"
        >
          Safety tips →
        </Link>
      </div>
    </div>
  );
}
