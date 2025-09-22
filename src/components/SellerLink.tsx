// src/components/SellerLink.tsx
"use client";

import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import React from "react";

type Props = {
  sellerName: string;
  className?: string;
  children?: React.ReactNode;
};

export default function SellerLink({ sellerName, className, children }: Props) {
  const selfName = getCurrentUser()?.name?.trim() || "";
  const isSelf = selfName && selfName.toLowerCase() === sellerName.trim().toLowerCase();

  // Public profile route shape in your app:
  const href = `/profile/${encodeURIComponent(sellerName)}`;

  return (
    <Link
      href={href}
      className={className}
      aria-label={isSelf ? "Go to your profile" : `View ${sellerName}'s profile`}
    >
      {children ?? sellerName}
    </Link>
  );
}
