// src/components/ui/badge.tsx
import * as React from "react";

type BadgeProps = {
  children: React.ReactNode;
  color?: "yellow" | "black" | "gray";
};

export function Badge({ children, color = "yellow" }: BadgeProps) {
  const styles =
    color === "yellow"
      ? "bg-yellow-500 text-black"
      : color === "black"
      ? "bg-black text-white"
      : "bg-gray-300 text-black";

  return (
    <span className={`px-2 py-1 rounded-md text-xs font-semibold ${styles}`}>
      {children}
    </span>
  );
}
