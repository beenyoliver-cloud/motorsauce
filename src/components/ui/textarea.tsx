// src/components/ui/textarea.tsx
import * as React from "react";

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Textarea({ ...props }: TextareaProps) {
  return (
    <textarea
      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
      {...props}
    />
  );
}
