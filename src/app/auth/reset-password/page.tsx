"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase";
import CenteredCard from "@/components/layout/CenteredCard";
import { CheckCircle, Lock } from "lucide-react";
import { validatePasswordStrength, getPasswordStrengthColor } from "@/lib/passwordValidation";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null);

  const passwordStrength = validatePasswordStrength(password);

  useEffect(() => {
    // Check if user has a valid recovery session
    const checkSession = async () => {
      const supabase = supabaseBrowser();
      const { data: { session } } = await supabase.auth.getSession();
      
      // User should have a session from the recovery link
      setIsValidSession(!!session);
    };
    checkSession();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    if (!passwordStrength.isValid) {
      return setErr(passwordStrength.errors[0] || "Password does not meet security requirements.");
    }

    if (password !== password2) {
      return setErr("Passwords do not match.");
    }

    try {
      setBusy(true);
      const supabase = supabaseBrowser();
      
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        throw error;
      }

      setSuccess(true);
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push("/auth/login");
      }, 3000);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to reset password. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const inputBase =
    "border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400 " +
    "bg-white text-gray-900 placeholder-gray-600 caret-gray-900";

  if (isValidSession === null) {
    return (
      <CenteredCard
        title="Reset your password"
        overlayImage="/images/msracing1.jpg"
        maxWidth="md"
        pad="p-8"
      >
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verifying your reset link...</p>
        </div>
      </CenteredCard>
    );
  }

  if (isValidSession === false) {
    return (
      <CenteredCard
        title="Invalid or expired link"
        overlayImage="/images/msracing1.jpg"
        maxWidth="md"
        pad="p-8"
      >
        <div className="text-center space-y-4">
          <p className="text-gray-700">
            This password reset link is invalid or has expired.
          </p>
          <a
            href="/auth/forgot-password"
            className="inline-block mt-4 px-4 py-2 bg-yellow-500 text-black font-semibold rounded-md hover:bg-yellow-600"
          >
            Request a new reset link
          </a>
        </div>
      </CenteredCard>
    );
  }

  if (success) {
    return (
      <CenteredCard
        title="Password reset successful"
        overlayImage="/images/msracing1.jpg"
        maxWidth="md"
        pad="p-8"
      >
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <p className="text-gray-700">
            Your password has been reset successfully.
          </p>
          <p className="text-sm text-gray-500">
            Redirecting you to sign in...
          </p>
          <a
            href="/auth/login"
            className="inline-block mt-4 text-yellow-600 hover:underline font-medium"
          >
            Sign in now →
          </a>
        </div>
      </CenteredCard>
    );
  }

  return (
    <CenteredCard
      title="Set new password"
      overlayImage="/images/msracing1.jpg"
      maxWidth="md"
      pad="p-8"
    >
      <div className="mb-4 flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <Lock className="w-5 h-5 text-blue-600 flex-shrink-0" />
        <p className="text-sm text-blue-800">
          Enter your new password below.
        </p>
      </div>

      {err && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 text-red-800 px-3 py-2 text-sm">
          {err}
        </div>
      )}

      <form onSubmit={submit} className="space-y-4">
        <label className="grid gap-1">
          <span className="text-sm text-gray-700">New password</span>
          <input
            type="password"
            className={inputBase}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter new password"
            autoComplete="new-password"
            autoFocus
          />
          {password && (
            <div className="mt-1">
              <div className="h-1 w-full bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all ${getPasswordStrengthColor(passwordStrength.score)}`}
                  style={{ width: `${(passwordStrength.score / 4) * 100}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {passwordStrength.score < 2 && "Weak password"}
                {passwordStrength.score === 2 && "Fair password"}
                {passwordStrength.score === 3 && "Good password"}
                {passwordStrength.score >= 4 && "Strong password"}
              </p>
            </div>
          )}
        </label>
        <label className="grid gap-1">
          <span className="text-sm text-gray-700">Confirm new password</span>
          <input
            type="password"
            className={inputBase}
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
            placeholder="Confirm new password"
            autoComplete="new-password"
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-md bg-yellow-500 text-black font-semibold px-4 py-2 hover:bg-yellow-600 disabled:opacity-60 shadow-sm"
        >
          {busy ? "Resetting..." : "Reset password"}
        </button>
      </form>
    </CenteredCard>
  );
}
