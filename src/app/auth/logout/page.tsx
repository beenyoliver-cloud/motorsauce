"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth";

export default function LogoutPage() {
  const router = useRouter();
  useEffect(() => {
    signOut();
    router.replace("/");
  }, [router]);
  return null;
}
