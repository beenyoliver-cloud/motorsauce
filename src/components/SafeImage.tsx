"use client";

import { useMemo, useState } from "react";

type Props = {
  src: string;             // can include or omit extension
  alt: string;
  className?: string;
  loading?: "eager" | "lazy";
  draggable?: boolean;
};

const EXT_CHAIN = ["jpg", "jpeg", "png", "webp"];

function buildCandidates(input: string): string[] {
  // If the path already has an extension, strip it and try multiple
  const m = input.match(/^(.*?)(\.(jpg|jpeg|png|webp))?$/i);
  const base = (m?.[1] || input).trim();
  return EXT_CHAIN.map((ext) => `${base}.${ext}`);
}

export default function SafeImage({ src, alt, className, loading, draggable }: Props) {
  const candidates = useMemo(() => buildCandidates(src), [src]);
  const [i, setI] = useState(0);

  // Stop at the last candidate; if all fail, keep the last URL (so layout stays stable)
  const onError = () => setI((p) => (p < candidates.length - 1 ? p + 1 : p));

  return (
    <img
      src={candidates[i]}
      alt={alt}
      className={className}
      loading={loading}
      onError={onError}
      draggable={draggable}
    />
  );
}
