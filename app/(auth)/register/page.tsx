"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/client";

function RegisterContent(): JSX.Element {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const handleOAuthSignUp = async () => {
    const supabase = createClient();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${siteUrl}/oauth/consent?next=/newuser`,
      },
    });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-[#768594] to-[#6d5d79] px-4 overflow-hidden">
      {/* Logo */}
      <div className="mb-6 relative w-[180px] h-[180px]">
        <svg
          width="180"
          height="180"
          viewBox="0 0 180 180"
          className="absolute inset-0"
          style={{
            animation: "spinExpandFade 2.2s cubic-bezier(0.2, 0.8, 0.2, 1) forwards",
            transformOrigin: "50% 50%",
          }}
        >
          {/* Asterisk strands */}
          <line
            x1="90"
            y1="90"
            x2="160"
            y2="90"
            stroke="white"
            strokeWidth="10"
            strokeLinecap="round"
            className="strand"
          />
          <line
            x1="90"
            y1="90"
            x2="111.6"
            y2="156.6"
            stroke="white"
            strokeWidth="10"
            strokeLinecap="round"
            className="strand"
          />
          <line
            x1="90"
            y1="90"
            x2="33.4"
            y2="131.2"
            stroke="white"
            strokeWidth="10"
            strokeLinecap="round"
            className="strand"
          />
          <line
            x1="90"
            y1="90"
            x2="33.4"
            y2="48.8"
            stroke="white"
            strokeWidth="10"
            strokeLinecap="round"
            className="strand"
          />
          <line
            x1="90"
            y1="90"
            x2="111.6"
            y2="23.4"
            stroke="white"
            strokeWidth="10"
            strokeLinecap="round"
            className="strand"
          />
        </svg>
        <svg width="180" height="180" viewBox="0 0 180 180">
          <line
            x1="90"
            y1="90"
            x2="160"
            y2="90"
            stroke="white"
            strokeWidth="10"
            strokeLinecap="round"
          />
          <line
            x1="90"
            y1="90"
            x2="111.6"
            y2="156.6"
            stroke="white"
            strokeWidth="10"
            strokeLinecap="round"
          />
          <line
            x1="90"
            y1="90"
            x2="33.4"
            y2="131.2"
            stroke="white"
            strokeWidth="10"
            strokeLinecap="round"
          />
          <line
            x1="90"
            y1="90"
            x2="33.4"
            y2="48.8"
            stroke="white"
            strokeWidth="10"
            strokeLinecap="round"
          />
          <line
            x1="90"
            y1="90"
            x2="111.6"
            y2="23.4"
            stroke="white"
            strokeWidth="10"
            strokeLinecap="round"
          />
        </svg>
      </div>

      <style jsx>{`
        @keyframes spinExpandFade {
          0% {
            transform: rotate(0deg) scale(0.2);
            opacity: 1;
          }
          100% {
            transform: rotate(360deg) scale(8);
            opacity: 0;
          }
        }
      `}</style>

      {/* Heading */}
      <h1 className="font-[family-name:var(--font-jetbrains-mono)] text-white text-3xl sm:text-5xl leading-none mb-6">
        welcome to timeline
      </h1>

      {/* Subheading */}
      <p className="font-['Jeju_Myeongjo',serif] text-white text-2xl sm:text-[40px] leading-none mb-12">
        sign up to continue
      </p>

      {/* Error message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm max-w-md w-full text-center">
          {error === "auth_callback_error"
            ? "There was an error signing up. Please try again."
            : "An error occurred. Please try again."}
        </div>
      )}

      {/* Continue with Google button */}
      <button
        onClick={handleOAuthSignUp}
        className="flex items-center justify-center gap-3 bg-white rounded-md px-12 py-3 w-full max-w-[471px] hover:bg-gray-50 transition-colors"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
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
        <span className="text-[#3c4043] font-medium text-sm">
          Continue with Google
        </span>
      </button>

      {/* Back to home link */}
      <Link
        href="/"
        className="mt-6 font-['Jeju_Myeongjo',serif] text-[#3e3b3b] text-sm hover:text-white/80 transition-colors"
      >
        back to home
      </Link>
    </div>
  );
}

export default function RegisterPage(): JSX.Element {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#768594] to-[#6d5d79]">
          <div className="animate-pulse text-white/70 font-[family-name:var(--font-jetbrains-mono)]">
            Loading...
          </div>
        </div>
      }
    >
      <RegisterContent />
    </Suspense>
  );
}
