"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail, CheckCircle, RefreshCw, ArrowLeft } from "lucide-react";
import CenteredCard from "@/components/layout/CenteredCard";
import { supabaseBrowser } from "@/lib/supabase";

function VerifyEmailLoading() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-yellow-500 border-t-transparent"></div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<VerifyEmailLoading />}>
      <VerifyEmailContent />
    </Suspense>
  );
}

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if user is already verified
  useEffect(() => {
    const checkAuth = async () => {
      const supabase = supabaseBrowser();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user?.email_confirmed_at) {
        // User is verified, redirect to home or profile
        router.replace("/");
      }
    };
    
    checkAuth();
    
    // Listen for auth state changes (in case they verify in another tab)
    const supabase = supabaseBrowser();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user?.email_confirmed_at) {
        router.replace("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  async function handleResend() {
    if (!email || resending) return;
    
    setResending(true);
    setError(null);
    
    try {
      const supabase = supabaseBrowser();
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      
      if (error) {
        setError(error.message);
      } else {
        setResent(true);
        setTimeout(() => setResent(false), 5000);
      }
    } catch (err) {
      setError("Failed to resend verification email");
    } finally {
      setResending(false);
    }
  }

  return (
    <CenteredCard
      title="Check your email"
      overlayImage="/images/msracing1.jpg"
      maxWidth="md"
      pad="p-8"
    >
      <div className="text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100">
          <Mail className="h-8 w-8 text-yellow-600" />
        </div>
        
        <h2 className="mb-2 text-xl font-semibold text-gray-900">
          Verify your email address
        </h2>
        
        <p className="mb-6 text-gray-600">
          We&apos;ve sent a verification link to{" "}
          {email ? (
            <span className="font-medium text-gray-900">{email}</span>
          ) : (
            "your email address"
          )}
          . Please click the link to verify your account.
        </p>

        <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <p className="text-sm text-yellow-800">
            <strong>Didn&apos;t receive the email?</strong> Check your spam folder, or click below to resend.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </div>
        )}

        {resent && (
          <div className="mb-4 flex items-center justify-center gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
            <CheckCircle className="h-4 w-4" />
            Verification email resent!
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={handleResend}
            disabled={resending || !email}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            {resending ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                Resend verification email
              </>
            )}
          </button>

          <Link
            href="/auth/login"
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-yellow-500 px-4 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-yellow-600"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to login
          </Link>
        </div>

        <p className="mt-6 text-xs text-gray-500">
          Already verified?{" "}
          <Link href="/auth/login" className="text-yellow-600 hover:underline">
            Sign in here
          </Link>
        </p>
      </div>
    </CenteredCard>
  );
}
