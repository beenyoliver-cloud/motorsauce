// src/components/ui/button.tsx
import * as React from "react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "outline";
};

export function Button({ children, variant = "primary", ...props }: ButtonProps) {
  const base = "px-4 py-2 rounded-xl font-semibold transition";
  const styles =
    variant === "primary"
      ? "bg-yellow-500 text-black hover:bg-yellow-600"
      : variant === "secondary"
      ? "bg-black text-white hover:bg-gray-800"
      : "border border-black text-black hover:bg-gray-100";

  return (
    <button className={`${base} ${styles}`} {...props}>
      {children}
    </button>
  );
}
