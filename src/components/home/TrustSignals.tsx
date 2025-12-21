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
  const marqueeSignals = [...signals, ...signals];

  return (
    <>
      <div className="relative py-3 overflow-hidden">
        <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-white to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-white to-transparent" />
        <div className="flex items-center">
          <div className="flex items-center gap-6 sm:gap-8 trust-marquee whitespace-nowrap">
            {marqueeSignals.map((signal, i) => (
              <div key={`${signal.text}-${i}`} className="flex items-center gap-2 text-gray-600 whitespace-nowrap px-3">
                <signal.icon className="w-4 h-4 flex-shrink-0" />
                <span className="text-xs sm:text-sm">{signal.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <style jsx>{`
        @keyframes trust-marquee {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .trust-marquee {
          animation: trust-marquee 28s linear infinite;
        }
        .trust-marquee:hover {
          animation-play-state: paused;
        }
      `}</style>
    </>
  );
}
