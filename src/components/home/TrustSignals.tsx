"use client";

import { Shield, Truck, CreditCard, MessageCircle } from "lucide-react";

const signals = [
  {
    icon: Shield,
    text: "Buyer protection on all orders",
  },
  {
    icon: Truck,
    text: "Tracked shipping available",
  },
  {
    icon: CreditCard,
    text: "Secure checkout via Stripe",
  },
  {
    icon: MessageCircle,
    text: "Message sellers directly",
  },
];

export default function TrustSignals() {
  return (
    <div className="flex items-center justify-center gap-6 sm:gap-8 py-3 overflow-x-auto">
      {signals.map((signal, i) => (
        <div key={i} className="flex items-center gap-2 text-gray-600 whitespace-nowrap">
          <signal.icon className="w-4 h-4 flex-shrink-0" />
          <span className="text-xs sm:text-sm">{signal.text}</span>
        </div>
      ))}
    </div>
  );
}
