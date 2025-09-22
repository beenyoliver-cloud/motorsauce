"use client";

import Link from "next/link";
import { isMe } from "@/lib/auth";

export default function EditProfileTopButton({
  displayName,
  baseHref,
}: {
  displayName: string;
  baseHref: string;
}) {
  // client-only check
  if (typeof window === "undefined" || !isMe(displayName)) return null;

  return (
    <Link
      href={`${baseHref}?tab=about&edit=1`}
      className="text-xs px-3 py-1.5 rounded-md border border-gray-300 bg-white text-gray-800 hover:bg-gray-50 text-center"
    >
      Edit profile
    </Link>
  );
}
