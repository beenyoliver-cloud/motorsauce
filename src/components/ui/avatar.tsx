import * as React from "react";

export function Avatar({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
      {children}
    </div>
  );
}

export function AvatarImage({ src, alt }: { src: string; alt?: string }) {
  return <img src={src} alt={alt} className="site-image" />;
}

export function AvatarFallback({ children }: { children: React.ReactNode }) {
  return <span className="text-sm text-gray-600">{children}</span>;
}
