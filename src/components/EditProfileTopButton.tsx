"use client";

import Link from "next/link";
import { isMe } from "@/lib/auth";
import { useEffect, useState } from "react";

export default function EditProfileTopButton({
  displayName,
  baseHref,
}: {
  displayName: string;
  baseHref: string;
}) {
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    isMe(displayName).then(result => setShowButton(result));
  }, [displayName]);

  if (!showButton) return null;

  return (
    <Link
      href={`/settings`}
      className="flex-1 md:flex-none text-xs sm:text-sm px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-800 hover:bg-gray-50 text-center inline-flex items-center justify-center font-medium"
    >
      Edit profile
    </Link>
  );
}
