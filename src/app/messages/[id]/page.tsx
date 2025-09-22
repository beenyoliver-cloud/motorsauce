"use client";

import { use } from "react";
import { useSearchParams } from "next/navigation";
import ThreadClient from "@/components/ThreadClient";

export default function MessagesThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params); // Next 15+ unwrap
  const threadId = decodeURIComponent(id);
  const sp = useSearchParams();
  const forceOfferToast = !!sp.get("offer");

  return (
    <section className="h-full">
      <ThreadClient threadId={threadId} forceOfferToast={forceOfferToast} />
    </section>
  );
}
