"use client";

import type { ReactNode } from "react";

type Props = { children: ReactNode };

// Simplified layout: full-width content, no inbox sidebar.
export default function MessagesLayout({ children }: Props) {
  return <>{children}</>;
}
