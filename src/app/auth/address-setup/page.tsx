"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";
import { supabaseBrowser } from "@/lib/supabase";
import CenteredCard from "@/components/layout/CenteredCard";
import { MapPin, Loader2 } from "lucide-react";

export default function AddressSetupPage() {
  const router = useRouter();
  const [sp, setSp] = useState(() => new URLSearchParams(typeof window !== 'undefined' ? window.location.search : ""));
  useEffect(() => {
    const onPop = () => setSp(new URLSearchParams(window.location.search));
    window.addEventListener("popstate", onPop as EventListener);
    return () => window.removeEventListener("popstate", onPop as EventListener);
  }, []);
  const next = sp.get("next") || "/";

  const [postcode, setPostcode] = useState("");
  const [county, setCounty] = useState("");
  const [country, setCountry] = useState("United Kingdom");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [validatingPostcode, setValidatingPostcode] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in
    const checkUser = async () => {
      const user = await getCurrentUser();
      if (!user) {
        router.replace(`/auth/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
        return;
      }
      setLoading(false);
    };
    checkUser();
  }, [router]);

  async function validateAndFetchPostcode() {
    if (!postcode.trim()) return;
    
    setValidatingPostcode(true);
    setErr(null);

    try {
      const response = await fetch(`/api/geocode/postcode?postcode=${encodeURIComponent(postcode.trim())}`);
      const data = await response.json();

      if (response.ok && data.county) {
        setCounty(data.county);
      }
    } catch (error) {
      console.error("Error validating postcode:", error);
    } finally {
      setValidatingPostcode(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    if (!postcode.trim()) return setErr("Please enter your postcode.");
    if (!county.trim()) return setErr("Please enter your county.");
    if (!country.trim()) return setErr("Please enter your country.");

    try {
      setBusy(true);
      const user = await getCurrentUser();
      if (!user) {
        router.replace("/auth/login");
        return;
      }

      const supabase = supabaseBrowser();
      const { error } = await supabase
        .from("profiles")
        .update({
          postcode: postcode.trim().toUpperCase(),
          county: county.trim(),
          country: country.trim(),
        })
        .eq("id", user.id);

      if (error) throw error;

      // Redirect to the original destination or home
      router.replace(next);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not save address.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-yellow-500" />
      </div>
    );
  }

  const inputBase =
    "border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400 " +
    "bg-white text-gray-900 placeholder-gray-600 caret-gray-900";

  return (
    <CenteredCard
      title="Set your location"
      overlayImage="/images/msracing1.jpg"
      maxWidth="md"
      pad="p-8"
    >
      <div className="mb-6 flex items-start gap-3 rounded-lg bg-blue-50 border border-blue-200 p-4">
        <MapPin className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-blue-900">
          <p className="font-medium mb-1">Why we need your location</p>
          <p className="text-blue-800">
            Your postcode helps us show you how far away parts are from you. Only your county and country are displayed publicly.
          </p>
        </div>
      </div>

      {err && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 text-red-800 px-3 py-2 text-sm">
          {err}
        </div>
      )}

      <form onSubmit={submit} className="space-y-4">
        <label className="grid gap-1">
          <span className="text-sm text-gray-700 font-medium">
            Postcode <span className="text-red-500">*</span>
          </span>
          <div className="flex gap-2">
            <input
              className={`${inputBase} flex-1 uppercase`}
              value={postcode}
              onChange={(e) => setPostcode(e.target.value.toUpperCase())}
              onBlur={validateAndFetchPostcode}
              placeholder="e.g., SW1A 1AA"
              required
            />
            {validatingPostcode && (
              <div className="flex items-center px-3">
                <Loader2 className="h-4 w-4 animate-spin text-yellow-500" />
              </div>
            )}
          </div>
          <p className="text-xs text-gray-500">
            Used for distance calculations (not shown publicly)
          </p>
        </label>

        <label className="grid gap-1">
          <span className="text-sm text-gray-700 font-medium">
            County <span className="text-red-500">*</span>
          </span>
          <input
            className={inputBase}
            value={county}
            onChange={(e) => setCounty(e.target.value)}
            placeholder="e.g., Greater London"
            required
          />
          <p className="text-xs text-gray-500">
            Will be displayed publicly on your profile
          </p>
        </label>

        <label className="grid gap-1">
          <span className="text-sm text-gray-700 font-medium">
            Country <span className="text-red-500">*</span>
          </span>
          <input
            className={inputBase}
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder="e.g., United Kingdom"
            required
          />
          <p className="text-xs text-gray-500">
            Will be displayed publicly on your profile
          </p>
        </label>

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-md bg-yellow-500 px-4 py-2 font-semibold text-black hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {busy ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Continue"
          )}
        </button>
      </form>

      <div className="mt-6 text-center">
        <button
          onClick={() => router.replace(next)}
          className="text-sm text-gray-600 hover:text-gray-900 underline"
        >
          Skip for now
        </button>
      </div>
    </CenteredCard>
  );
}
