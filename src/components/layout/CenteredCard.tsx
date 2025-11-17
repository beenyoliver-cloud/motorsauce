// Reusable centered card layout for auth and form pages
"use client";
import React from "react";

type CenteredCardProps = {
  title?: string;
  children: React.ReactNode;
  maxWidth?: string; // tailwind max-w value e.g. 'md', 'sm'
  pad?: string; // padding utility
  footer?: React.ReactNode;
  overlayImage?: string; // optional background image
};

export default function CenteredCard({
  title,
  children,
  maxWidth = "md",
  pad = "p-6",
  footer,
  overlayImage,
}: CenteredCardProps) {
  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-10">
      {overlayImage && (
        <>
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url('${overlayImage}')` }}
            aria-hidden="true"
          />
          <div className="absolute inset-0 bg-black/45" aria-hidden="true" />
        </>
      )}
      <div
        className={`relative w-full max-w-${maxWidth} rounded-2xl bg-white/95 backdrop-blur border border-gray-200 shadow-xl ${pad}`}
      >
        {title && <h1 className="text-2xl font-bold text-black mb-5 text-center">{title}</h1>}
        {children}
        {footer && <div className="mt-5">{footer}</div>}
      </div>
    </div>
  );
}
