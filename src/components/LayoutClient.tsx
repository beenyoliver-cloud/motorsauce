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
    
    const showLoadingAfter2s = () => {
      loadingTimer = setTimeout(() => {
        setIsLoading(true);
      }, 2000);
    };

    // Start the 2 second timer on route change
    showLoadingAfter2s();

    return () => {
      // Clear timer and hide loading when route changes or component unmounts
      if (loadingTimer) {
        clearTimeout(loadingTimer);
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
