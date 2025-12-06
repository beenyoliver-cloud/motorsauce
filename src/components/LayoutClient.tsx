// src/components/LayoutClient.tsx
"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { LoadingAnimation } from "./LoadingAnimation";

export function LayoutClient({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Show loading on route change
    setIsLoading(true);
    
    // Hide loading after minimal delay (page transition is fast)
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [pathname]);

  return (
    <>
      {isLoading && <LoadingAnimation />}
      {children}
    </>
  );
}
