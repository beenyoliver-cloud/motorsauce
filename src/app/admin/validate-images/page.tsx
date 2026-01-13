"use client";

import { useState } from "react";
import { CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";

type ValidationResult = {
  total?: number;
  validated?: number;
  failed?: number;
  drafted?: string[];
  message?: string;
};

export default function ImageValidationPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runValidation() {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/listings/validate-images", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ validateAll: true }),
      });

      if (!response.ok) {
        throw new Error("Validation failed");
      }

      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Image Validation Tool
          </h1>
          <p className="text-sm text-gray-600 mb-6">
            Validate all active listing images and auto-draft listings with broken images.
          </p>

          <button
            onClick={runValidation}
            disabled={loading}
            className="inline-flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold px-6 py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Validating...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-5 w-5" />
                Run Validation
              </>
            )}
          </button>

          {/* Results */}
          {result && (
            <div className="mt-6 p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                Validation Complete
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                  <div className="text-2xl font-bold text-gray-900">
                    {result.total || 0}
                  </div>
                  <div className="text-sm text-gray-600">Total Listings</div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                  <div className="text-2xl font-bold text-green-600">
                    {result.validated || 0}
                  </div>
                  <div className="text-sm text-gray-600">Valid Images</div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                  <div className="text-2xl font-bold text-red-600">
                    {result.failed || 0}
                  </div>
                  <div className="text-sm text-gray-600">Failed & Drafted</div>
                </div>
              </div>

              {result.drafted && result.drafted.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div>
                      <h3 className="font-semibold text-yellow-900 mb-2">
                        Listings Auto-Drafted
                      </h3>
                      <div className="text-sm text-yellow-800 space-y-1">
                        {result.drafted.map((id) => (
                          <div key={id}>
                            Listing ID: <code className="bg-yellow-100 px-2 py-0.5 rounded">{id}</code>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                <span className="font-semibold">Error:</span>
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">
              How it works
            </h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Checks all active listing images for accessibility</li>
              <li>• Auto-drafts listings with broken images</li>
              <li>• Adds reason: &quot;Some images may be broken or inaccessible&quot;</li>
              <li>• Sellers can see drafts in their profile and fix images</li>
            </ul>
          </div>

          {/* CRON Setup */}
          <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <h3 className="font-semibold text-purple-900 mb-2">
              Automate with CRON
            </h3>
            <p className="text-sm text-purple-800 mb-2">
              Add this to your <code>vercel.json</code> to run daily at 2 AM:
            </p>
            <pre className="bg-purple-100 p-3 rounded text-xs overflow-x-auto">
{`{
  "crons": [{
    "path": "/api/listings/validate-images?cron_secret=YOUR_SECRET",
    "schedule": "0 2 * * *"
  }]
}`}
            </pre>
            <p className="text-xs text-purple-700 mt-2">
              Set <code>CRON_SECRET</code> in your environment variables.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
