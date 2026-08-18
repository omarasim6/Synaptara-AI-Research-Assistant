"use client";

import { useState, useEffect, Suspense } from "react";
import { signIn, getSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import FullPageLoader from "@/app/components/FullPageLoader";

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908C16.658 14.013 17.64 11.71 17.64 9.2z" fill="#4285F4"/>
    <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.909-2.259c-.806.54-1.837.86-3.047.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
    <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
  </svg>
);

const EyeIcon = ({ visible }: { visible: boolean }) =>
  visible ? (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );

const Spinner = () => (
  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"/>
);

const InlineError = ({ msg }: { msg: string }) => (
  <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
      <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M6 3.5v3M6 8v.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
    {msg}
  </p>
);

const ERROR_MAP: Record<string, string> = {
  CredentialsSignin: "Incorrect email or password. Please try again.",
  OAuthAccountNotLinked: "This email is linked to a different sign-in method. Try Google instead.",
  OAuthSignin: "Could not start the Google sign-in flow. Please try again.",
  OAuthCallback: "Something went wrong while connecting to Google. Please try again.",
  Default: "Something went wrong. Please try again.",
};

// Errors that specifically stem from the Google OAuth flow — for these we
// show a Google-branded banner with an inline retry button, instead of the
// generic red text, so the fix is obvious at a glance.
const OAUTH_ERRORS = new Set(["OAuthAccountNotLinked", "OAuthSignin", "OAuthCallback", "OAuthCreateAccount", "Callback"]);

function validateEmail(v: string) {
  if (!v.trim()) return "Email is required.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return "Enter a valid email address.";
  return "";
}
function validatePassword(v: string) {
  if (!v) return "Password is required.";
  return "";
}

function SignInContent() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") || "/dashboard";
  const errorParam = params.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false });
  const [bannerError, setBannerError] = useState("");
  const [bannerIsOAuth, setBannerIsOAuth] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [pendingQuery, setPendingQuery] = useState("");

  useEffect(() => {
    if (errorParam) {
      setBannerError(ERROR_MAP[errorParam] ?? ERROR_MAP.Default);
      setBannerIsOAuth(OAUTH_ERRORS.has(errorParam));
    }
  }, [errorParam]);

  useEffect(() => {
    getSession().then((s) => { if (s) router.replace(callbackUrl); });
  }, [callbackUrl, router]);

  // Show the pending search query (read from callbackUrl's ?q= param) so the
  // user knows what they'll get after signing in
  useEffect(() => {
    try {
      const url = new URL(callbackUrl, window.location.origin);
      const q = url.searchParams.get("q");
      if (q) setPendingQuery(q);
    } catch { /* malformed callbackUrl — ignore */ }
  }, [callbackUrl]);

  const emailErr   = touched.email    ? validateEmail(email)       : "";
  const passwordErr = touched.password ? validatePassword(password) : "";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ email: true, password: true });
    if (validateEmail(email) || validatePassword(password)) return;

    setBannerError("");
    setBannerIsOAuth(false);
    setLoading(true);
    try {
      const res = await signIn("credentials", { email: email.trim(), password, redirect: false });
      if (res?.error) {
        setBannerError(ERROR_MAP[res.error] ?? ERROR_MAP.Default);
        setBannerIsOAuth(false);
      } else {
        router.replace(callbackUrl);
        router.refresh();
      }
    } catch {
      setBannerError("An unexpected error occurred. Please try again.");
      setBannerIsOAuth(false);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    try { await signIn("google", { callbackUrl }); }
    catch {
      setBannerError("Could not start Google sign-in.");
      setBannerIsOAuth(true);
      setGoogleLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#EDEADE] dark:bg-dark-bg flex flex-col items-center justify-center px-4 sm:px-6 py-8 sm:py-12">

      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 mb-8 sm:mb-10">
        <Image src="/icon.png" alt="Synaptara" width={32} height={32} className="rounded-xl" />
        <span className="font-display text-lg sm:text-xl font-semibold text-[#1a3a35] dark:text-dark-text">Synaptara</span>
      </Link>

      {/* Card */}
      <div className="w-full max-w-sm bg-white dark:bg-dark-surface border border-[#e4e0d4] dark:border-dark-border rounded-2xl shadow-sm p-6 sm:p-8">
        <h2 className="font-display text-2xl sm:text-3xl text-[#1a3a35] dark:text-dark-text text-center mb-1">Welcome back</h2>
        <p className="text-[#4a7c6f] dark:text-dark-muted text-xs sm:text-sm text-center mb-6 sm:mb-7">Sign in to your account</p>

        {/* Pending search hint */}
        {pendingQuery && (
          <div className="mb-5 flex items-start gap-2.5 bg-[#f5f3ee] dark:bg-dark-surface border border-[#e4e0d4] dark:border-dark-border rounded-xl px-4 py-3">
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" className="shrink-0 mt-px text-[#4a7c6f] dark:text-dark-muted">
              <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.4"/>
              <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
            <p className="text-xs text-[#1a3a35] dark:text-dark-text leading-snug">
              Sign in to see results for{" "}
              <span className="font-semibold">&ldquo;{pendingQuery}&rdquo;</span>
            </p>
          </div>
        )}

        {/* Error banner — OAuth errors get a Google-branded banner that
            visually points down at the Google button below (border removed
            on the shared edge, arrow connector), since the fix is always
            "try Google again" and that should be obvious at a glance. */}
        {bannerError && bannerIsOAuth && (
          <div className="mb-0 flex items-start gap-2.5 bg-red-50 dark:bg-red-500/10 border border-b-0 border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400 rounded-t-xl px-4 py-3">
            <GoogleIcon/>
            <p className="text-xs sm:text-sm leading-snug pt-px">{bannerError}</p>
          </div>
        )}

        {/* Error banner — everything else (credentials errors, generic
            failures) keeps the plain banner since Google isn't the fix. */}
        {bannerError && !bannerIsOAuth && (
          <div className="mb-5 flex items-start gap-2.5 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400 rounded-xl px-4 py-3">
            <svg width="15" height="15" viewBox="0 0 16 16" className="shrink-0 mt-px" fill="none">
              <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.3"/>
              <path d="M8 4.5v4M8 10.5v.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            <p className="text-xs sm:text-sm leading-snug">{bannerError}</p>
          </div>
        )}

        {/* Google — highlighted with a red ring and relabeled when the error
            above is OAuth-specific, so the retry action is unmistakable. */}
        <button
          type="button"
          onClick={handleGoogle}
          disabled={googleLoading || loading}
          className={`w-full flex items-center justify-center gap-2.5 bg-white dark:bg-dark-surface border text-xs sm:text-sm font-medium text-[#1a3a35] dark:text-dark-text hover:bg-[#f5f3ee] dark:hover:bg-white/5 active:bg-[#ece9e2] transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            bannerIsOAuth
              ? "mb-5 rounded-b-xl rounded-t-none px-4 py-2.5 sm:py-3 border-red-300 dark:border-red-500/40 ring-2 ring-red-100 dark:ring-red-500/10"
              : "rounded-xl px-4 py-2 sm:py-2.5 border-[#dedad0] dark:border-dark-border"
          }`}
        >
          {googleLoading ? <Spinner/> : <GoogleIcon/>}
          {googleLoading ? "Redirecting…" : bannerIsOAuth ? "Try again with Google" : "Continue with Google"}
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 my-4 sm:my-5">
          <div className="flex-1 h-px bg-[#e4e0d4] dark:bg-dark-surface"/>
          <span className="text-xs text-[#a09c8e] dark:text-[#7d9691]">or continue with email</span>
          <div className="flex-1 h-px bg-[#e4e0d4] dark:bg-dark-surface"/>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate className="space-y-3 sm:space-y-4">

          {/* Email field */}
          <div>
            <label htmlFor="si-email" className="block text-xs sm:text-sm font-medium text-[#1a3a35] dark:text-dark-text mb-1">Email</label>
            <input
              id="si-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, email: true }))}
              placeholder="you@example.com"
              className={`w-full bg-white dark:bg-dark-surface border rounded-xl px-4 py-2 sm:py-2.5 text-xs sm:text-sm text-[#1a3a35] dark:text-dark-text placeholder-[#b0ad9e] dark:placeholder-[#5f7d76] outline-none transition-all ${
                emailErr
                  ? "border-red-400 focus:border-red-400 focus:ring-2 focus:ring-red-100"
                  : "border-[#dedad0] dark:border-dark-border focus:border-[#4a7c6f] focus:ring-2 focus:ring-[#4a7c6f]/10"
              }`}
            />
            {emailErr && <InlineError msg={emailErr}/>}
          </div>

          {/* Password field */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="si-password" className="block text-xs sm:text-sm font-medium text-[#1a3a35] dark:text-dark-text">Password</label>
              <a href="#" className="text-xs text-[#4a7c6f] dark:text-dark-muted hover:underline">Forgot password?</a>
            </div>
            <div className="relative">
              <input
                id="si-password"
                type={showPw ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                placeholder="••••••••"
                className={`w-full bg-white dark:bg-dark-surface border rounded-xl px-4 py-2 sm:py-2.5 pr-11 text-xs sm:text-sm text-[#1a3a35] dark:text-dark-text placeholder-[#b0ad9e] dark:placeholder-[#5f7d76] outline-none transition-all ${
                  passwordErr
                    ? "border-red-400 focus:border-red-400 focus:ring-2 focus:ring-red-100"
                    : "border-[#dedad0] dark:border-dark-border focus:border-[#4a7c6f] focus:ring-2 focus:ring-[#4a7c6f]/10"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                aria-label={showPw ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a09c8e] dark:text-[#7d9691] hover:text-[#1a3a35] dark:hover:text-dark-text transition-colors"
              >
                <EyeIcon visible={showPw}/>
              </button>
            </div>
            {passwordErr && <InlineError msg={passwordErr}/>}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || googleLoading}
            className="w-full flex items-center justify-center gap-2 bg-[#1a3a35] dark:bg-dark-surface-2 text-[#EDEADE] dark:text-dark-text text-xs sm:text-sm font-medium py-2 sm:py-2.5 rounded-xl hover:bg-[#2d5248] active:bg-[#132e29] transition-colors mt-1 sm:mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <><Spinner/> Signing in…</> : "Sign in"}
          </button>
        </form>

        <p className="text-center text-xs sm:text-sm text-[#6b6b6b] dark:text-dark-muted mt-5 sm:mt-6">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-[#1a3a35] dark:text-dark-text font-medium hover:underline">Sign up</Link>
        </p>
      </div>

      <Link href="/" className="mt-6 text-xs text-[#000000] dark:text-dark-text hover:text-[#234029] transition-colors">
        ← Back to home
      </Link>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<FullPageLoader />}>
      <SignInContent/>
    </Suspense>
  );
}
