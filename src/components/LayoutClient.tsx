// src/components/LayoutClient.tsx
"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { LoadingAnimation } from "./LoadingAnimation";

export function LayoutClient({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(false);
  const [previousPathname, setPreviousPathname] = useState(pathname);

  useEffect(() => {
    // Only trigger loading animation on actual route changes, not on initial load
    if (pathname === previousPathname) {
      return;
    }

    // Timer to show loading animation only if page takes >2 seconds
    let loadingTimer: NodeJS.Timeout;
    const pageLoadTimer: NodeJS.Timeout = setTimeout(() => {
      setIsLoading(false);
    }, 3500);
    
    const showLoadingAfter2s = () => {
      loadingTimer = setTimeout(() => {
        setIsLoading(true);
      }, 2000);
    };

    // Start the 2 second timer on route change
    showLoadingAfter2s();

    return () => {
      if (loadingTimer) {
        clearTimeout(loadingTimer);
      }
      if (pageLoadTimer) {
        clearTimeout(pageLoadTimer);
      }
      setIsLoading(false);
    };
  }, [pathname, previousPathname]);

  useEffect(() => {
    setPreviousPathname(pathname);
  }, [pathname]);

  return (
    <>
      {isLoading && <LoadingAnimation />}
      {children}
    </>
  );
}
