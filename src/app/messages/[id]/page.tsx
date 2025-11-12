"use client";

import { use, useEffect, useState } from "react";
import ThreadClient from "@/components/ThreadClient";

export default function MessagesThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params); // Next 15+ unwrap
  const threadId = decodeURIComponent(id);
  const [forceOfferToast, setForceOfferToast] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setForceOfferToast(params.get("offer") ? true : false);
  }, []);

  return (
    <section className="h-full">
      <ThreadClient threadId={threadId} forceOfferToast={forceOfferToast} />
    </section>
  );
}
