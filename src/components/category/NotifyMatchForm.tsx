"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase";
import { getMainCategories, getSubcategoriesForMain, type MainCategory } from "@/data/partCategories";

type FormState = {
  partName: string;
  alertName: string;
  category: string;
  mainCategory: MainCategory | "";
  subcategory: string;
  make: string;
  model: string;
  year: string;
  condition: string;
  priceMin: string;
  priceMax: string;
};

const DRAFT_KEY = "ms:notify-part:category:v1";

const CATEGORY_OPTIONS = [
  { value: "", label: "Any category" },
  { value: "OEM", label: "OEM parts" },
  { value: "Aftermarket", label: "Aftermarket" },
  { value: "Tool", label: "Tools & accessories" },
];

const CONDITION_OPTIONS = [
  { value: "", label: "Any condition" },
  { value: "New", label: "New" },
  { value: "Used - Like New", label: "Used - Like New" },
  { value: "Used - Good", label: "Used - Good" },
  { value: "Used - Fair", label: "Used - Fair" },
];

function buildSearchName(state: FormState): string {
  const parts: string[] = [];
  if (state.partName.trim()) parts.push(state.partName.trim());

  const vehicle = [state.make, state.model, state.year].map((v) => v.trim()).filter(Boolean).join(" ");
  if (vehicle) parts.push(vehicle);
  if (state.subcategory) parts.push(state.subcategory);
  if (state.category) parts.push(state.category);

  return parts.join(" - ").slice(0, 80) || "Part alert";
}

export default function NotifyMatchForm() {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [state, setState] = useState<FormState>({
    partName: "",
    alertName: "",
    category: "",
    mainCategory: "",
    subcategory: "",
    make: "",
    model: "",
    year: "",
    condition: "",
    priceMin: "",
    priceMax: "",
  });

  const mainCategories = useMemo(() => getMainCategories(), []);
  const subcategories = useMemo(
    () => (state.mainCategory ? getSubcategoriesForMain(state.mainCategory) : []),
    [state.mainCategory]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<FormState>;
      setState((prev) => ({ ...prev, ...parsed }));
    } catch {
      // ignore draft errors
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(state));
    } catch {
      // ignore draft errors
    }
  }, [state]);

  useEffect(() => {
    let cancelled = false;
    async function loadUser() {
      try {
        const supabase = supabaseBrowser();
        const { data: { user } } = await supabase.auth.getUser();
        if (!cancelled) {
          setUserEmail(user?.email || null);
        }
      } catch {
        if (!cancelled) setUserEmail(null);
      }
    }
    loadUser();
    return () => {
      cancelled = true;
    };
  }, []);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!state.partName.trim()) {
      setError("Tell us the part you need so we can match listings.");
      return;
    }

    const supabase = supabaseBrowser();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      const next = `${window.location.pathname}#notify-part`;
      router.push(`/auth/login?next=${encodeURIComponent(next)}`);
      return;
    }

    const filters: Record<string, string> = {};
    const partName = state.partName.trim();
    if (partName) filters.q = partName;
    if (state.category) filters.category = state.category;
    if (state.mainCategory) filters.mainCategory = state.mainCategory;
    if (state.subcategory) filters.subcategory = state.subcategory;
    if (state.make.trim()) filters.make = state.make.trim();
    if (state.model.trim()) filters.model = state.model.trim();
    if (state.year.trim()) {
      filters.yearMin = state.year.trim();
      filters.yearMax = state.year.trim();
    }
    if (state.condition) filters.condition = state.condition;
    if (state.priceMin.trim()) filters.priceMin = state.priceMin.trim();
    if (state.priceMax.trim()) filters.priceMax = state.priceMax.trim();

    const name = state.alertName.trim() || buildSearchName(state);

    setStatus("saving");
    try {
      const res = await fetch("/api/saved-searches", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          name,
          filters,
          notify_new_matches: true,
        }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        const msg = typeof payload?.error === "string" ? payload.error : "Failed to save alert";
        setError(msg);
        setStatus("error");
        return;
      }

      setStatus("success");
      setState({
        partName: "",
        alertName: "",
        category: state.category,
        mainCategory: "",
        subcategory: "",
        make: "",
        model: "",
        year: "",
        condition: "",
        priceMin: "",
        priceMax: "",
      });
      if (typeof window !== "undefined") {
        localStorage.removeItem(DRAFT_KEY);
      }
    } catch (err) {
      console.error("[notify-match] Save failed", err);
      setError("Something went wrong while saving your alert.");
      setStatus("error");
    } finally {
      setStatus((current) => (current === "saving" ? "idle" : current));
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6 sm:p-8" id="notify-part">
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-bold text-gray-900">Get notified when a part lands</h2>
        <p className="text-sm text-gray-600 max-w-2xl">
          Tell us exactly what you need and we will email you when a matching listing goes live.
        </p>
      </div>

      {!userEmail && (
        <div className="mt-4 rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
          Sign in to save alerts and get email notifications for your account.
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Part name or OEM number" required>
            <input
              type="text"
              value={state.partName}
              onChange={(e) => updateField("partName", e.target.value)}
              placeholder="e.g. BMW M3 brake pads"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-yellow-500 focus:outline-none focus:ring-1 focus:ring-yellow-500"
              required
            />
          </Field>
          <Field label="Alert name (optional)">
            <input
              type="text"
              value={state.alertName}
              onChange={(e) => updateField("alertName", e.target.value)}
              placeholder="e.g. M3 brake pads under 80"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-yellow-500 focus:outline-none focus:ring-1 focus:ring-yellow-500"
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Top-level category">
            <select
              value={state.category}
              onChange={(e) => updateField("category", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-yellow-500 focus:outline-none focus:ring-1 focus:ring-yellow-500"
            >
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Main category">
            <select
              value={state.mainCategory}
              onChange={(e) => {
                updateField("mainCategory", e.target.value as MainCategory | "");
                updateField("subcategory", "");
              }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-yellow-500 focus:outline-none focus:ring-1 focus:ring-yellow-500"
            >
              <option value="">Any main category</option>
              {mainCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Subcategory">
            <select
              value={state.subcategory}
              onChange={(e) => updateField("subcategory", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-yellow-500 focus:outline-none focus:ring-1 focus:ring-yellow-500"
              disabled={!state.mainCategory}
            >
              <option value="">{state.mainCategory ? "Any subcategory" : "Select a main category"}</option>
              {subcategories.map((sub) => (
                <option key={sub} value={sub}>
                  {sub}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Field label="Make">
            <input
              type="text"
              value={state.make}
              onChange={(e) => updateField("make", e.target.value)}
              placeholder="e.g. BMW"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-yellow-500 focus:outline-none focus:ring-1 focus:ring-yellow-500"
            />
          </Field>
          <Field label="Model">
            <input
              type="text"
              value={state.model}
              onChange={(e) => updateField("model", e.target.value)}
              placeholder="e.g. M3"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-yellow-500 focus:outline-none focus:ring-1 focus:ring-yellow-500"
            />
          </Field>
          <Field label="Year">
            <input
              type="number"
              value={state.year}
              onChange={(e) => updateField("year", e.target.value)}
              placeholder="e.g. 2018"
              min="1900"
              max="2100"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-yellow-500 focus:outline-none focus:ring-1 focus:ring-yellow-500"
            />
          </Field>
          <Field label="Condition">
            <select
              value={state.condition}
              onChange={(e) => updateField("condition", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-yellow-500 focus:outline-none focus:ring-1 focus:ring-yellow-500"
            >
              {CONDITION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Min price (optional)">
            <input
              type="number"
              value={state.priceMin}
              onChange={(e) => updateField("priceMin", e.target.value)}
              placeholder="e.g. 50"
              min="0"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-yellow-500 focus:outline-none focus:ring-1 focus:ring-yellow-500"
            />
          </Field>
          <Field label="Max price (optional)">
            <input
              type="number"
              value={state.priceMax}
              onChange={(e) => updateField("priceMax", e.target.value)}
              placeholder="e.g. 200"
              min="0"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-yellow-500 focus:outline-none focus:ring-1 focus:ring-yellow-500"
            />
          </Field>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {status === "success" && (
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-700">
            Alert saved. We will email {userEmail || "your account"} when a match appears.
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-gray-500">
            Alerts are sent to {userEmail || "your account email"} and can be managed in Saved Searches.
          </p>
          <button
            type="submit"
            disabled={status === "saving"}
            className="inline-flex items-center justify-center rounded-lg bg-yellow-500 px-4 py-2 text-sm font-semibold text-black hover:bg-yellow-600 disabled:opacity-60"
          >
            {status === "saving" ? "Saving alert..." : "Save alert"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, required = false, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm text-gray-700">
      <span className="text-xs font-semibold text-gray-700">
        {label}
        {required ? <span className="text-yellow-600"> *</span> : null}
      </span>
      {children}
    </label>
  );
}
