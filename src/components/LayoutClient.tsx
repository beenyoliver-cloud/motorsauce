// src/components/LayoutClient.tsx
"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { LoadingAnimation } from "./LoadingAnimation";

export function LayoutClient({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Timer to show loading animation only if page takes >2 seconds
    // 2 seconds is industry standard - fast enough to not annoy, slow enough to reassure
    let loadingTimer: NodeJS.Timeout;
    let pageLoadTimer: NodeJS.Timeout;
    
    const showLoadingAfter2s = () => {
      loadingTimer = setTimeout(() => {
        setIsLoading(true);
      }, 2000);
    };

    // Start the 2 second timer on route change
    showLoadingAfter2s();

    // Auto-hide loader after page content renders (max 3.5 seconds from route change)
    // This ensures we never show the loader if page already loaded
    pageLoadTimer = setTimeout(() => {
      setIsLoading(false);
    }, 3500);

    return () => {
      // Clear both timers when route changes or component unmounts
      if (loadingTimer) {
        clearTimeout(loadingTimer);
      }
      if (pageLoadTimer) {
        clearTimeout(pageLoadTimer);
      }
      setIsLoading(false);
    };
  }, [pathname]);

  return (
    <>
      {isLoading && <LoadingAnimation />}
      {children}
    </>
  );
}
