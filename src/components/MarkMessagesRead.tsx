"use client";

import { useEffect } from "react";

export default function MarkMessagesRead() {
  useEffect(() => {
    // set unread to 0 and notify header to update
    localStorage.setItem("ms_unread_count", "0");
    window.dispatchEvent(new Event("ms:unread"));
  }, []);
  return null;
}
