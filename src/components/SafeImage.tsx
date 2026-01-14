"use client";

import { useMemo, useRef, useState, useEffect } from "react";

type Props = {
  src: string;
  alt: string;
  className?: string;
  loading?: "eager" | "lazy";
  draggable?: boolean;
};

const EXT_CHAIN = ["jpg", "jpeg", "png", "webp"];
const BRAND_FALLBACK = "/images/newlogonewm.jpg";
const PLACEHOLDER_SUFFIXES = ["/images/placeholder.jpg", "/images/placeholder.png"];

function buildCandidates(input: string): string[] {
  const trimmed = (input || "").trim();
  if (!trimmed) return [];
  if (trimmed.startsWith("data:") || trimmed.startsWith("blob:")) return [trimmed];
  if (/[?#]/.test(trimmed)) return [trimmed];
  const m = trimmed.match(/^(.*?)(\.(jpg|jpeg|png|webp))?$/i);
  const base = (m?.[1] || trimmed).trim();
  return EXT_CHAIN.map((ext) => `${base}.${ext}`);
}

function isPlaceholderUrl(url: string): boolean {
  const cleaned = url.split("?")[0]?.split("#")[0]?.toLowerCase() || "";
  return PLACEHOLDER_SUFFIXES.some((suffix) => cleaned.endsWith(suffix));
}

export default function SafeImage({ src, alt, className, loading = "lazy", draggable }: Props) {
  const candidates = useMemo(() => buildCandidates(src), [src]);
  const [currentSrc, setCurrentSrc] = useState<string>(() => candidates[0] || src || BRAND_FALLBACK);
  const [attempt, setAttempt] = useState(0);
  const [usedFallback, setUsedFallback] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    setAttempt(0);
    setUsedFallback(false);
    setCurrentSrc(candidates[0] || src || BRAND_FALLBACK);
  }, [src, candidates]);

  const hideListingCard = () => {
    const el = imgRef.current?.closest("[data-listing-card]");
    if (el instanceof HTMLElement) {
      el.style.display = "none";
      el.setAttribute("data-hidden-reason", "image-missing");
      return el.getAttribute("data-listing-card") || null;
    }
    return null;
  };

  const handleFinalFailure = () => {
    const listingId = hideListingCard();
    if (!usedFallback) {
      setUsedFallback(true);
      setCurrentSrc(BRAND_FALLBACK);
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("ms:listing-image-missing", {
            detail: { src, listingId },
          })
        );
      }
    } else {
      if (typeof window !== "undefined" && listingId) {
        window.dispatchEvent(
          new CustomEvent("ms:listing-image-missing", {
            detail: { src, listingId },
          })
        );
      }
    }
  };

  const onError = () => {
    if (!usedFallback && attempt < candidates.length - 1) {
      setAttempt((prev) => prev + 1);
      setCurrentSrc(candidates[attempt + 1]);
      return;
    }
    handleFinalFailure();
  };

  useEffect(() => {
    if (!src) return;
    if (isPlaceholderUrl(src)) {
      handleFinalFailure();
    }
  }, [src]);

  return (
    <img
      ref={imgRef}
      src={currentSrc}
      alt={alt}
      className={className}
      loading={loading}
      onError={onError}
      draggable={draggable}
    />
  );
}
