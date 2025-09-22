// src/components/ui/dropdown-menu.tsx
"use client";
import * as React from "react";

export function DropdownMenu({ children }: { children: React.ReactNode }) {
  return <div className="relative inline-block">{children}</div>;
}

export function DropdownMenuTrigger({ children }: { children: React.ReactNode }) {
  return <button className="px-3 py-2 rounded-md hover:bg-gray-100">{children}</button>;
}

export function DropdownMenuContent({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50">
      {children}
    </div>
  );
}

export function DropdownMenuItem({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <div
      className="px-4 py-2 hover:bg-yellow-100 cursor-pointer text-black"
      onClick={onClick}
    >
      {children}
    </div>
  );
}
