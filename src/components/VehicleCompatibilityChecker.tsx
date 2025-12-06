"use client";

import { useState } from "react";
import { Check, X, Loader2, AlertCircle } from "lucide-react";
import type { Vehicle } from "@/lib/listingsService";

interface VehicleCompatibilityCheckerProps {
  vehicles?: Vehicle[];
  universal?: boolean;
  className?: string;
}

interface RegistrationResult {
  make: string;
  model: string;
  year?: number;
  trim?: string;
}

export default function VehicleCompatibilityChecker({
  vehicles = [],
  universal = false,
  className = "",
}: VehicleCompatibilityCheckerProps) {
  const [regInput, setRegInput] = useState("");
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<RegistrationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCompatible, setIsCompatible] = useState<boolean | null>(null);

  const handleLookup = async () => {
    if (!regInput.trim()) {
      setError("Please enter a registration number");
      return;
    }

    setChecking(true);
    setError(null);
    setResult(null);
    setIsCompatible(null);

    try {
      const res = await fetch(
        `/api/garage/registration-lookup?reg=${encodeURIComponent(regInput.trim())}`
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data.error || `Lookup failed: ${res.statusText}`
        );
      }

      const data: RegistrationResult = await res.json();
      setResult(data);

      // Check compatibility
      if (universal) {
        setIsCompatible(true);
      } else {
        const compatible = vehicles.some(
          (v) =>
            v.make.toLowerCase() === data.make.toLowerCase() &&
            v.model.toLowerCase() === data.model.toLowerCase() &&
            (!v.year || v.year === data.year)
        );
        setIsCompatible(compatible);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to lookup registration");
      setIsCompatible(false);
    } finally {
      setChecking(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleLookup();
    }
  };

  return (
    <div className={`rounded-lg border border-gray-200 bg-white p-5 ${className}`}>
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-black">Will this part fit my car?</h3>
        <p className="mt-1 text-sm text-gray-600">
          Enter your registration number to check compatibility
        </p>
      </div>

      {/* Input section */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={regInput}
          onChange={(e) => setRegInput(e.target.value.toUpperCase())}
          onKeyPress={handleKeyPress}
          placeholder="e.g. AB24VXF"
          maxLength={7}
          disabled={checking}
          className="flex-1 rounded-md border border-gray-300 px-3 py-2.5 text-sm placeholder-gray-500 focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-500/20 disabled:bg-gray-100"
        />
        <button
          onClick={handleLookup}
          disabled={checking || !regInput.trim()}
          className="rounded-md bg-gold-600 px-4 py-2.5 text-sm font-medium text-black hover:bg-gold-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition flex items-center gap-2"
        >
          {checking ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="hidden sm:inline">Checking...</span>
            </>
          ) : (
            "Check"
          )}
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4 flex gap-2 rounded-md bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Result section */}
      {result && (
        <div className="space-y-3">
          {/* Vehicle details */}
          <div className="rounded-md bg-gray-50 p-3">
            <div className="text-sm text-gray-600">
              <div>
                <span className="font-medium text-black">
                  {result.make} {result.model}
                </span>
                {result.year && <span className="ml-2 text-gray-500">({result.year})</span>}
              </div>
              {result.trim && <div className="text-xs text-gray-500 mt-1">{result.trim}</div>}
            </div>
          </div>

          {/* Compatibility result */}
          <div
            className={`flex items-center gap-3 rounded-md p-3 ${
              isCompatible
                ? "bg-green-50 border border-green-200"
                : "bg-red-50 border border-red-200"
            }`}
          >
            {isCompatible ? (
              <>
                <Check className="h-5 w-5 text-green-600 shrink-0" />
                <div>
                  <div className="font-medium text-green-900">Compatible</div>
                  <div className="text-sm text-green-700">
                    {universal
                      ? "This part fits all vehicles"
                      : "This part is compatible with your vehicle"}
                  </div>
                </div>
              </>
            ) : (
              <>
                <X className="h-5 w-5 text-red-600 shrink-0" />
                <div>
                  <div className="font-medium text-red-900">Not Compatible</div>
                  <div className="text-sm text-red-700">
                    This part doesn't fit your vehicle
                  </div>
                </div>
              </>
            )}
          </div>

          {/* List of compatible vehicles */}
          {!universal && vehicles.length > 0 && (
            <div className="border-t border-gray-200 pt-3 mt-3">
              <div className="text-xs font-medium text-gray-600 mb-2">Compatible vehicles:</div>
              <div className="space-y-1">
                {vehicles.map((v, idx) => (
                  <div key={idx} className="text-sm text-gray-700">
                    {v.make} {v.model}
                    {v.year && <span className="text-gray-500"> ({v.year})</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Info section when no result yet */}
      {!result && !error && (
        <div className="rounded-md bg-blue-50 p-3 text-sm text-blue-700">
          {universal ? (
            <p>✓ This is a universal part that fits all vehicles</p>
          ) : vehicles.length > 0 ? (
            <p>
              This part is compatible with{" "}
              <strong>
                {vehicles.length} vehicle{vehicles.length !== 1 ? "s" : ""}
              </strong>
            </p>
          ) : (
            <p>No vehicle compatibility information available</p>
          )}
        </div>
      )}
    </div>
  );
}
