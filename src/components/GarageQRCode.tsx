// src/components/GarageQRCode.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { QrCode, Download, Share2, Copy, Check } from "lucide-react";

interface GarageQRCodeProps {
  username: string;
  vehicleCount: number;
}

export default function GarageQRCode({ username, vehicleCount }: GarageQRCodeProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const garageUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/profile/${encodeURIComponent(username)}#garage`;

  useEffect(() => {
    if (showModal) {
      generateQRCode();
    }
  }, [showModal, garageUrl]);

  const generateQRCode = () => {
    // Simple QR code generation using Canvas API
    // For production, consider using a library like 'qrcode' or 'qr-code-styling'
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = 256;
    canvas.width = size;
    canvas.height = size;

    // White background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size, size);

    // For now, create a simple visual placeholder
    // In production, use a proper QR library
    ctx.fillStyle = "#000000";
    ctx.font = "14px monospace";
    ctx.textAlign = "center";
    ctx.fillText("QR CODE", size / 2, size / 2 - 40);
    ctx.fillText("PLACEHOLDER", size / 2, size / 2 - 20);
    ctx.font = "10px monospace";
    ctx.fillText("Use 'qrcode' library", size / 2, size / 2 + 20);
    ctx.fillText("for production", size / 2, size / 2 + 35);

    // Draw border
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 4;
    ctx.strokeRect(20, 20, size - 40, size - 40);

    // Convert to data URL
    setQrDataUrl(canvas.toDataURL("image/png"));
  };

  const downloadQRCode = () => {
    if (!qrDataUrl) return;

    const link = document.createElement("a");
    link.download = `${username}-garage-qr.png`;
    link.href = qrDataUrl;
    link.click();
  };

  const copyGarageUrl = async () => {
    try {
      await navigator.clipboard.writeText(garageUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const shareGarage = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${username}'s Garage`,
          text: `Check out my ${vehicleCount} vehicle${vehicleCount !== 1 ? "s" : ""} on Motorsauce!`,
          url: garageUrl,
        });
      } catch (err) {
        console.error("Share failed:", err);
      }
    } else {
      // Fallback to copy
      copyGarageUrl();
    }
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 hover:bg-gray-50 transition-colors text-sm font-medium"
        title="Generate QR code for garage"
      >
        <QrCode className="h-4 w-4" />
        QR Code
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Garage QR Code</h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
              >
                ✕
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Share your garage with others by scanning this QR code or copying the link below.
            </p>

            {/* QR Code Display */}
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-white rounded-xl border-2 border-gray-200 shadow-sm">
                <canvas ref={canvasRef} className="max-w-full h-auto" />
              </div>
            </div>

            {/* Garage URL */}
            <div className="mb-6">
              <label className="block text-xs font-semibold text-gray-700 mb-2">
                Garage URL
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={garageUrl}
                  readOnly
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm text-gray-900 font-mono"
                />
                <button
                  onClick={copyGarageUrl}
                  className={`px-3 py-2 rounded-lg border transition-colors ${
                    copied
                      ? "bg-green-50 border-green-300 text-green-700"
                      : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                  }`}
                  title="Copy URL"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={downloadQRCode}
                disabled={!qrDataUrl}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-yellow-500 text-black font-semibold hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="h-4 w-4" />
                Download QR
              </button>
              <button
                onClick={shareGarage}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900 hover:bg-gray-50 font-semibold"
              >
                <Share2 className="h-4 w-4" />
                Share
              </button>
            </div>

            {/* Note */}
            <p className="mt-4 text-xs text-gray-500 text-center">
              📱 Note: QR code links to your public garage profile. Make sure your garage is set to public.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
