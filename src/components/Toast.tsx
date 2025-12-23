"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Info } from "lucide-react";

type ToastType = "success" | "info";

interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

let toastQueue: ToastMessage[] = [];
let setToastsFn: ((messages: ToastMessage[]) => void) | null = null;

export function showToast(message: string, type: ToastType = "success") {
  const id = `toast-${Date.now()}-${Math.random()}`;
  const newToast: ToastMessage = { id, message, type };
  
  toastQueue = [...toastQueue, newToast];
  if (setToastsFn) setToastsFn([...toastQueue]);
  
  setTimeout(() => {
    toastQueue = toastQueue.filter(t => t.id !== id);
    if (setToastsFn) setToastsFn([...toastQueue]);
  }, 2800);
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setToastsFn = setToasts;
    return () => {
      setToastsFn = null;
    };
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium animate-toast-in ${
            toast.type === "success" ? "bg-pink-600" : "bg-gray-800"
          }`}
        >
          {toast.type === "success" ? (
            <Check className="w-4 h-4" />
          ) : (
            <Info className="w-4 h-4" />
          )}
          <span>{toast.message}</span>
        </div>
      ))}
      <style jsx>{`
        @keyframes toast-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-toast-in {
          animation: toast-in 0.3s ease-out;
        }
      `}</style>
    </div>,
    document.body
  );
}
