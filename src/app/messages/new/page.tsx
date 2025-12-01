"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase";

function NewMessageRouterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function findOrCreateThread() {
      try {
        const to = searchParams.get("to")?.trim();
        const body = searchParams.get("body")?.trim();
        const listingRef = searchParams.get("ref")?.trim();

        if (!to) {
          router.replace("/messages");
          return;
        }

        const supabase = supabaseBrowser();
        
        // Get current user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          router.push("/auth/login?next=/messages");
          return;
        }

        // Find peer by name (case-insensitive)
        const { data: peerProfiles } = await supabase
          .from("profiles")
          .select("id, name")
          .ilike("name", to);

        if (!peerProfiles || peerProfiles.length === 0) {
          setError(`Could not find user "${to}"`);
          setTimeout(() => router.replace("/messages"), 2000);
          return;
        }

        const peer = peerProfiles[0];

        if (peer.id === user.id) {
          setError("You cannot message yourself");
          setTimeout(() => router.replace("/messages"), 2000);
          return;
        }

        // Get auth token for API call
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push("/auth/login?next=/messages");
          return;
        }

        // Call API to find or create thread
        const response = await fetch("/api/messages/threads", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            peerId: peer.id,
            listingRef: listingRef || null,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to create conversation");
        }

        const { thread } = await response.json();

        // If there's an initial message, navigate with it as a query param
        // The ThreadClientNew component can handle showing it in the input
        if (body) {
          router.replace(`/messages/${encodeURIComponent(thread.id)}?initialMessage=${encodeURIComponent(body)}`);
        } else {
          router.replace(`/messages/${encodeURIComponent(thread.id)}`);
        }
      } catch (err) {
        console.error("[NewMessage] Error:", err);
        setError(err instanceof Error ? err.message : "Failed to create conversation");
        setTimeout(() => router.replace("/messages"), 2000);
      }
    }

    findOrCreateThread();
  }, [router, searchParams]);

  return (
    <section className="page-center px-4 py-16">
      <div className="max-w-md mx-auto rounded-xl border border-gray-200 bg-white p-6 text-sm shadow-sm text-center">
        {error ? (
          <div className="text-red-600 font-medium">{error}</div>
        ) : (
          <div className="text-gray-700">Finding or creating conversation…</div>
        )}
      </div>
    </section>
  );
}

export default function NewMessageRouter() {
  return (
    <Suspense fallback={
      <section className="page-center px-4 py-16">
        <div className="max-w-md mx-auto rounded-xl border border-gray-200 bg-white p-6 text-sm shadow-sm text-center">
          <div className="text-gray-700">Loading…</div>
        </div>
      </section>
    }>
      <NewMessageRouterContent />
    </Suspense>
  );
}
