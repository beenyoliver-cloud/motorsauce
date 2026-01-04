"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { registerUser } from "@/lib/auth";
import CenteredCard from "@/components/layout/CenteredCard";
import { 
  validatePasswordStrength, 
  getPasswordStrengthLabel, 
  getPasswordStrengthColor 
} from "@/lib/passwordValidation";
import { Shield, Check, X } from "lucide-react";

type AccountType = 'individual' | 'business';

export default function RegisterPage() {
  const router = useRouter();
  const [sp, setSp] = useState(() => new URLSearchParams(typeof window !== 'undefined' ? window.location.search : ""));
  useEffect(() => {
    const onPop = () => setSp(new URLSearchParams(window.location.search));
    window.addEventListener("popstate", onPop as EventListener);
    return () => window.removeEventListener("popstate", onPop as EventListener);
  }, []);
  const next = sp.get("next") || "";

  const [accountType, setAccountType] = useState<AccountType>('individual');
  const [name, setName] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  
  // Business-specific fields
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("");
  
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showPasswordHints, setShowPasswordHints] = useState(false);

  // Password strength validation
  const passwordStrength = validatePasswordStrength(pw);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    if (!name.trim()) return setErr("Please enter a display name.");
    if (accountType === 'individual' && !fullName.trim()) return setErr("Please enter your full name.");
    if (!email.trim() || !email.includes("@")) return setErr("Please enter a valid email.");
    
    // Enhanced password validation
    if (!passwordStrength.isValid) {
      return setErr(passwordStrength.errors[0] || "Password does not meet security requirements.");
    }
    if (pw !== pw2) return setErr("Passwords do not match.");
    
    // Business validation
    if (accountType === 'business') {
      if (!businessName.trim()) return setErr("Please enter your business name.");
      if (!businessType) return setErr("Please select your business type.");
    }

    try {
      setBusy(true);
      const result = await registerUser(name, email, pw, accountType, accountType === 'business' ? {
        businessName: businessName.trim(),
        businessType
      } : undefined);
      
      // Check if email verification is required
      if (result.requiresEmailVerification) {
        // Redirect to verify email page
        router.replace(`/auth/verify-email?email=${encodeURIComponent(email)}`);
      } else {
        // Redirect to address collection page after successful registration
        router.replace(`/auth/address-setup?next=${encodeURIComponent(next || `/profile/${encodeURIComponent(result.user.name)}`)}`);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not register.");
    } finally {
      setBusy(false);
    }
  }

  const inputBase =
    "border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400 " +
    "bg-white text-gray-900 placeholder-gray-600 caret-gray-900";

  return (
    <CenteredCard
      title="Create your account"
      overlayImage="/images/msracing1.jpg"
      maxWidth="md"
      pad="p-8"
      footer={
        <p className="text-sm text-gray-700 text-center">
          Already have an account?{" "}
          <a
            href={`/auth/login${next ? `?next=${encodeURIComponent(next)}` : ""}`}
            className="text-yellow-600 hover:underline font-medium"
          >
            Sign in
          </a>
        </p>
      }
    >
      {err && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 text-red-800 px-3 py-2 text-sm">
          {err}
        </div>
      )}
      <form onSubmit={submit} className="space-y-4">
        {/* Account Type Selection */}
        <div className="space-y-2">
          <span className="text-sm text-gray-700 font-medium">Account type</span>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setAccountType('individual')}
              className={`relative p-4 rounded-lg border-2 transition-all ${
                accountType === 'individual'
                  ? 'border-yellow-500 bg-yellow-50'
                  : 'border-gray-300 bg-white hover:border-gray-400'
              }`}
            >
              <div className="text-left">
                <div className="flex items-center gap-2 mb-1">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="font-semibold text-gray-900">Individual</span>
                </div>
                <p className="text-xs text-gray-600">Personal seller account</p>
              </div>
              {accountType === 'individual' && (
                <div className="absolute top-2 right-2">
                  <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </button>
            
            <button
              type="button"
              onClick={() => setAccountType('business')}
              className={`relative p-4 rounded-lg border-2 transition-all ${
                accountType === 'business'
                  ? 'border-yellow-500 bg-yellow-50'
                  : 'border-gray-300 bg-white hover:border-gray-400'
              }`}
            >
              <div className="text-left">
                <div className="flex items-center gap-2 mb-1">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <span className="font-semibold text-gray-900">Business</span>
                </div>
                <p className="text-xs text-gray-600">Professional storefront</p>
              </div>
              {accountType === 'business' && (
                <div className="absolute top-2 right-2">
                  <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </button>
          </div>
        </div>

        {/* Individual-specific fields */}
        {accountType === 'individual' && (
          <label className="grid gap-1">
            <span className="text-sm text-gray-700">Full name</span>
            <input
              className={inputBase}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. John Smith"
            />
          </label>
        )}

        <label className="grid gap-1">
          <span className="text-sm text-gray-700">Display name</span>
          <input
            className={inputBase}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Partsguy123"
          />
        </label>
        
        {/* Business-specific fields */}
        {accountType === 'business' && (
          <>
            <label className="grid gap-1">
              <span className="text-sm text-gray-700">Business name</span>
              <input
                className={inputBase}
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g. Performance Parts Ltd"
              />
            </label>
            
            <label className="grid gap-1">
              <span className="text-sm text-gray-700">Business type</span>
              <select
                className={inputBase}
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
              >
                <option value="">Select business type...</option>
                <option value="oem_supplier">OEM Supplier</option>
                <option value="breaker">Breaker / Salvage Yard</option>
                <option value="parts_retailer">Parts Retailer</option>
                <option value="performance_tuner">Performance Tuner</option>
                <option value="restoration_specialist">Restoration Specialist</option>
                <option value="racing_team">Racing Team</option>
                <option value="custom_fabricator">Custom Fabricator</option>
                <option value="other">Other</option>
              </select>
            </label>
          </>
        )}
        <label className="grid gap-1">
          <span className="text-sm text-gray-700">Email</span>
          <input
            type="email"
            className={inputBase}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </label>
        <div className="space-y-2">
          <label className="grid gap-1">
            <span className="text-sm text-gray-700 flex items-center gap-2">
              Password
              <Shield className="h-4 w-4 text-gray-400" />
            </span>
            <input
              type="password"
              className={inputBase}
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              onFocus={() => setShowPasswordHints(true)}
              placeholder="Create a strong password"
            />
          </label>

          {/* Password Strength Indicator */}
          {pw.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${getPasswordStrengthColor(passwordStrength.score)}`}
                    style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                  />
                </div>
                <span className={`text-xs font-medium ${
                  passwordStrength.score <= 2 ? 'text-red-600' : 
                  passwordStrength.score === 3 ? 'text-yellow-600' : 
                  'text-green-600'
                }`}>
                  {getPasswordStrengthLabel(passwordStrength.score)}
                </span>
              </div>

              {/* Password Requirements */}
              {showPasswordHints && (
                <div className="bg-gray-50 border border-gray-200 rounded-md p-3 space-y-1.5">
                  <div className="text-xs font-semibold text-gray-700 mb-2">Password must contain:</div>
                  <div className={`flex items-center gap-2 text-xs ${pw.length >= 8 ? 'text-green-600' : 'text-gray-600'}`}>
                    {pw.length >= 8 ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                    At least 8 characters
                  </div>
                  <div className={`flex items-center gap-2 text-xs ${/[A-Z]/.test(pw) ? 'text-green-600' : 'text-gray-600'}`}>
                    {/[A-Z]/.test(pw) ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                    One uppercase letter
                  </div>
                  <div className={`flex items-center gap-2 text-xs ${/[a-z]/.test(pw) ? 'text-green-600' : 'text-gray-600'}`}>
                    {/[a-z]/.test(pw) ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                    One lowercase letter
                  </div>
                  <div className={`flex items-center gap-2 text-xs ${/[0-9]/.test(pw) ? 'text-green-600' : 'text-gray-600'}`}>
                    {/[0-9]/.test(pw) ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                    One number
                  </div>
                  <div className={`flex items-center gap-2 text-xs ${/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(pw) ? 'text-green-600' : 'text-gray-600'}`}>
                    {/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(pw) ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                    One special character (!@#$%^&*)
                  </div>
                  
                  {passwordStrength.suggestions.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <div className="text-xs text-amber-600">
                        {passwordStrength.suggestions[0]}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <label className="grid gap-1">
          <span className="text-sm text-gray-700">Confirm password</span>
          <input
            type="password"
            className={inputBase}
            value={pw2}
            onChange={(e) => setPw2(e.target.value)}
            placeholder="Repeat your password"
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-md bg-yellow-500 text-black font-semibold px-4 py-2 hover:bg-yellow-600 disabled:opacity-60 shadow-sm"
        >
          {busy ? "Creating…" : "Create account"}
        </button>
      </form>

      {/* Divider */}
      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300"></div>
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-white px-2 text-gray-500">Or continue with</span>
        </div>
      </div>

      {/* Google sign-in button */}
      <button
        type="button"
        onClick={() => alert('Google OAuth not yet configured. Please use email/password registration.')}
        className="w-full flex items-center justify-center gap-3 px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition-colors"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        <span className="text-sm font-medium text-gray-700">Continue with Google</span>
      </button>
    </CenteredCard>
  );
}
