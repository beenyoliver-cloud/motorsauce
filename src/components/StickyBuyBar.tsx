"use client";

import Link from "next/link";

export default function StickyBuyBar({
  price,
  buyHref,
  messageHref,
}: {
  price: string;
  buyHref: string;
  messageHref: string;
}) {
  return (
    <div className="md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/70">
      <div className="mx-auto max-w-6xl px-3 py-2 flex items-center gap-2">
        <div className="flex-1">
          <div className="text-[10px] text-gray-700 leading-none">Price</div>
          <div className="text-lg font-extrabold text-gray-900 leading-tight">{price}</div>
        </div>
        <Link
          href={messageHref}
          className="px-2.5 py-1.5 rounded-md border border-gray-400 bg-white text-gray-900 text-xs font-medium hover:bg-gray-100"
        >
          Message
        </Link>
        <Link
          href={buyHref}
          className="px-3 py-1.5 rounded-md bg-yellow-500 text-black text-xs font-semibold hover:bg-yellow-600"
        >
          Buy now
        </Link>
      </div>
    </div>
  );
}
