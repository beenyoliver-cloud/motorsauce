"use client";
import { useEffect, useState } from "react";
import MobileTabBar from "@/components/MobileTabBar";
import { getCurrentUser } from "@/lib/auth";

export default function MobileNavWrapper() {
  const [profileHref, setProfileHref] = useState<string | null>(null);

  useEffect(() => {
    const refresh = async () => {
      const user = await getCurrentUser();
      if (user?.id) {
        setProfileHref(`/profile/id/${encodeURIComponent(user.id)}`);
        return;
      }
      if (user?.name) {
        setProfileHref(`/profile/${encodeURIComponent(user.name)}`);
        return;
      }
      setProfileHref(null);
    };

    refresh();
    window.addEventListener("ms:auth", refresh as EventListener);
    return () => window.removeEventListener("ms:auth", refresh as EventListener);
  }, []);

  return <MobileTabBar profileHref={profileHref} />;
}
