"use client";

import { useState } from "react";
import { UploadCloud, FileText, AlertTriangle, CheckCircle2, X } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  onUploaded: () => void;
};

type UploadResult = {
  inserted: number;
  failed: number;
  items?: Array<{ id: string; title: string }>;
  errors?: Array<{ row: number; message: string }>;
};

export default function BulkUploadDialog({ open, onClose, onUploaded }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Choose a CSV file before uploading.");
      return;
    }
    setError(null);
    setResult(null);
    setBusy(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/business/bulk-upload", {
        method: "POST",
        body: formData,
      });
      const payload = await res.json();
      if (!res.ok) {
        setError(payload?.error || "Upload failed. Please try again.");
        return;
      }
      setResult(payload);
      setFile(null);
      if (payload?.inserted > 0) {
        onUploaded();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-900"
          aria-label="Close bulk upload dialog"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-yellow-100 text-yellow-700 flex items-center justify-center">
            <UploadCloud className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Bulk upload parts</h2>
            <p className="text-sm text-gray-600">Import up to 200 rows at a time from our CSV template.</p>
          </div>
        </div>

        <div className="bg-gray-50 rounded-xl border border-dashed border-gray-300 p-4 mb-4 text-sm text-gray-700">
          <p className="font-semibold mb-2 flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Format checklist
          </p>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>Required columns: <strong>Title</strong> and <strong>Price</strong></li>
            <li>Optional columns: Condition, Category, Description, Make, Model, Year From / Year To, Image URLs</li>
            <li>Separate multiple image URLs with commas or semicolons</li>
            <li>Each file is limited to 4&nbsp;MB and 200 rows</li>
            <li>
              Need the template?{" "}
              <a
                href="/templates/bulk-listings-template.csv"
                target="_blank"
                rel="noreferrer"
                className="text-yellow-600 hover:underline font-medium"
              >
                Download CSV
              </a>
            </li>
          </ul>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Select CSV file</span>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => {
                setFile(e.target.files?.[0] || null);
                setError(null);
                setResult(null);
              }}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800"
            />
          </label>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5" />
              {error}
            </div>
          )}

          {result && (
            <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800 space-y-1">
              <div className="flex items-center gap-2 font-semibold">
                <CheckCircle2 className="h-4 w-4" />
                Upload summary
              </div>
              <p>{result.inserted} listings drafted</p>
              {result.failed > 0 && (
                <div className="mt-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <p className="font-semibold mb-1">Rows with issues ({result.failed}):</p>
                  <ul className="space-y-1 max-h-32 overflow-auto">
                    {result.errors?.map((err) => (
                      <li key={err.row} className="text-xs">
                        Row {err.row}: {err.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-lg bg-yellow-500 px-4 py-2 text-sm font-semibold text-black hover:bg-yellow-400 disabled:opacity-60"
            >
              {busy && <span className="h-3 w-3 rounded-full border-2 border-black border-t-transparent animate-spin" />}
              {busy ? "Uploading..." : "Upload list"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
