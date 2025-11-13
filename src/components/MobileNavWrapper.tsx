"use client";
import { useEffect, useState } from "react";
import MobileTabBar from "@/components/MobileTabBar";
import { getCurrentUser } from "@/lib/auth";

export default function MobileNavWrapper() {
  const [name, setName] = useState<string | null>(null);
  useEffect(() => { getCurrentUser().then(u => setName(u?.name || null)); }, []);
  return <MobileTabBar currentUser={name} />;
}
