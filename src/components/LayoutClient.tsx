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

  useEffect(() => {
    const handled = new Set<string>();

    const onMissingImage = (event: Event) => {
      const detail = (event as CustomEvent).detail as { listingId?: string | number } | undefined;
      const listingId = detail?.listingId;
      if (!listingId) return;
      const key = String(listingId);
      if (handled.has(key)) return;
      handled.add(key);

      try {
        const sessionKey = `ms:image-missing:${key}`;
        if (typeof sessionStorage !== "undefined") {
          if (sessionStorage.getItem(sessionKey)) return;
          sessionStorage.setItem(sessionKey, "1");
        }
      } catch {
        // ignore sessionStorage failures
      }

      const payload = JSON.stringify({ listingId: key });
      try {
        if (navigator.sendBeacon) {
          const blob = new Blob([payload], { type: "application/json" });
          navigator.sendBeacon("/api/listings/validate-images", blob);
        } else {
          fetch("/api/listings/validate-images", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: payload,
            keepalive: true,
          }).catch(() => {});
        }
      } catch {
        // ignore network failures
      }
    };

    window.addEventListener("ms:listing-image-missing", onMissingImage as EventListener);
    return () => {
      window.removeEventListener("ms:listing-image-missing", onMissingImage as EventListener);
    };
  }, []);

  return (
    <>
      {isLoading && <LoadingAnimation />}
      {children}
    </>
  );
}
