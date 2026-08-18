"use client";

import { useState, useEffect, Suspense } from "react";
import { signIn, getSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import FullPageLoader from "@/app/components/FullPageLoader";

// ── Icons ─────────────────────────────────────────────────────────────────────

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

const CheckIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <circle cx="6" cy="6" r="5" fill="#4a7c6f" opacity="0.15"/>
    <path d="M3.5 6L5.5 8L8.5 4.5" stroke="#4a7c6f" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
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

// ── Validation helpers ────────────────────────────────────────────────────────

function validateName(v: string) {
  if (!v.trim()) return "Full name is required.";
  if (v.trim().length < 2) return "Name must be at least 2 characters.";
  return "";
}

function validateEmail(v: string) {
  if (!v.trim()) return "Email is required.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return "Enter a valid email address.";
  return "";
}

function validatePassword(v: string) {
  if (!v) return "Password is required.";
  if (v.length < 8) return "Password must be at least 8 characters.";
  return "";
}

function validateConfirm(pw: string, confirm: string) {
  if (!confirm) return "Please confirm your password.";
  if (pw !== confirm) return "Passwords do not match.";
  return "";
}

// ── Password strength ─────────────────────────────────────────────────────────

type Strength = "weak" | "fair" | "strong";

function getStrength(pw: string): Strength | null {
  if (!pw) return null;
  const hasUpper   = /[A-Z]/.test(pw);
  const hasLower   = /[a-z]/.test(pw);
  const hasNumber  = /\d/.test(pw);
  const hasSpecial = /[^A-Za-z0-9]/.test(pw);
  const score = [pw.length >= 8, hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length;
  if (score <= 2) return "weak";
  if (score <= 3) return "fair";
  return "strong";
}

const STRENGTH_CONFIG: Record<Strength, { bars: number; color: string; label: string }> = {
  weak:   { bars: 1, color: "bg-red-400",    label: "Weak"   },
  fair:   { bars: 2, color: "bg-yellow-400", label: "Fair"   },
  strong: { bars: 3, color: "bg-[#4a7c6f] dark:bg-[#4a7c6f]",  label: "Strong" },
};

function PasswordStrength({ password }: { password: string }) {
  const strength = getStrength(password);
  if (!strength) return null;
  const { bars, color, label } = STRENGTH_CONFIG[strength];
  return (
    <div className="mt-2 flex items-center gap-2">
      <div className="flex gap-1 flex-1">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= bars ? color : "bg-[#e4e0d4] dark:bg-dark-surface"}`}
          />
        ))}
      </div>
      <span className={`text-xs font-medium ${
        strength === "weak"   ? "text-red-400"    :
        strength === "fair"   ? "text-yellow-500" : "text-[#4a7c6f] dark:text-dark-muted"
      }`}>{label}</span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

function SignUpContent() {
  const router     = useRouter();
  const params     = useSearchParams();
  const callbackUrl = params.get("callbackUrl") || "/dashboard";

  const [name,    setName]    = useState("");
  const [email,   setEmail]   = useState("");
  const [pw,      setPw]      = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw,      setShowPw]      = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [touched, setTouched] = useState({
    name: false, email: false, pw: false, confirm: false,
  });
  const [bannerError, setBannerError] = useState("");
  const [loading,       setLoading]       = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [pendingQuery,  setPendingQuery]  = useState("");

  // Redirect if already signed in
  useEffect(() => {
    getSession().then((s) => { if (s) router.replace(callbackUrl); });
  }, [callbackUrl, router]);

  // Show the pending search query (read from callbackUrl's ?q= param) so the
  // user knows what they'll get after signing up
  useEffect(() => {
    try {
      const url = new URL(callbackUrl, window.location.origin);
      const q = url.searchParams.get("q");
      if (q) setPendingQuery(q);
    } catch { /* malformed callbackUrl — ignore */ }
  }, [callbackUrl]);

  // Per-field errors (only shown after blur)
  const nameErr    = touched.name    ? validateName(name)                : "";
  const emailErr   = touched.email   ? validateEmail(email)              : "";
  const pwErr      = touched.pw      ? validatePassword(pw)              : "";
  const confirmErr = touched.confirm ? validateConfirm(pw, confirm)      : "";

  const allValid =
    !validateName(name) &&
    !validateEmail(email) &&
    !validatePassword(pw) &&
    !validateConfirm(pw, confirm);

  const touch = (field: keyof typeof touched) =>
    setTouched((t) => ({ ...t, [field]: true }));

  // ── Submit ──────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ name: true, email: true, pw: true, confirm: true });
    if (!allValid) return;

    setBannerError("");
    setLoading(true);
    try {
      // 1. Register user via API
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password: pw }),
      });
      const data: { error?: string } = await res.json();

      if (!res.ok) {
        setBannerError(data.error ?? "Registration failed. Please try again.");
        setLoading(false);
        return;
      }

      // 2. Auto sign-in after successful registration
      const signInResult = await signIn("credentials", {
        email: email.trim(),
        password: pw,
        redirect: false,
      });

      if (signInResult?.error) {
        // Account created but auto-login failed — send to sign in
        router.replace("/signin?registered=1");
        return;
      }

      router.replace(callbackUrl);
      router.refresh();
    } catch {
      setBannerError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    try { await signIn("google", { callbackUrl }); }
    catch { setBannerError("Could not start Google sign-in."); setGoogleLoading(false); }
  }

  const confirmMatch = confirm.length > 0 && pw === confirm;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#EDEADE] dark:bg-dark-bg flex flex-col items-center justify-center px-4 sm:px-6 py-8 sm:py-12">

      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 mb-8 sm:mb-10">
        <Image src="/icon.png" alt="Synaptara" width={32} height={32} className="rounded-xl" />
        <span className="font-display text-lg sm:text-xl font-semibold text-[#1a3a35] dark:text-dark-text">Synaptara</span>
      </Link>

      {/* Card */}
      <div className="w-full max-w-sm bg-white dark:bg-dark-surface border border-[#e4e0d4] dark:border-dark-border rounded-2xl shadow-sm p-6 sm:p-8">
        <h2 className="font-display text-2xl sm:text-3xl text-[#1a3a35] dark:text-dark-text text-center mb-1">Create account</h2>
        <p className="text-[#4a7c6f] dark:text-dark-muted text-xs sm:text-sm text-center mb-6 sm:mb-7">Start your research journey today</p>

        {/* Pending search hint */}
        {pendingQuery && (
          <div className="mb-5 flex items-start gap-2.5 bg-[#f5f3ee] dark:bg-dark-surface border border-[#e4e0d4] dark:border-dark-border rounded-xl px-4 py-3">
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" className="shrink-0 mt-px text-[#4a7c6f] dark:text-dark-muted">
              <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.4"/>
              <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
            <p className="text-xs text-[#1a3a35] dark:text-dark-text leading-snug">
              Create an account to see results for{" "}
              <span className="font-semibold">&ldquo;{pendingQuery}&rdquo;</span>
            </p>
          </div>
        )}

        {/* Error banner */}
        {bannerError && (
          <div className="mb-5 flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3">
            <svg width="15" height="15" viewBox="0 0 16 16" className="shrink-0 mt-px" fill="none">
              <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.3"/>
              <path d="M8 4.5v4M8 10.5v.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            <p className="text-xs sm:text-sm leading-snug">{bannerError}</p>
          </div>
        )}

        {/* Google */}
        <button
          type="button"
          onClick={handleGoogle}
          disabled={googleLoading || loading}
          className="w-full flex items-center justify-center gap-2.5 bg-white dark:bg-dark-surface border border-[#dedad0] dark:border-dark-border rounded-xl px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium text-[#1a3a35] dark:text-dark-text hover:bg-[#f5f3ee] dark:hover:bg-white/5 active:bg-[#ece9e2] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {googleLoading ? <Spinner/> : <GoogleIcon/>}
          {googleLoading ? "Redirecting…" : "Continue with Google"}
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 my-4 sm:my-5">
          <div className="flex-1 h-px bg-[#e4e0d4] dark:bg-dark-surface"/>
          <span className="text-xs text-[#a09c8e] dark:text-[#7d9691]">or sign up with email</span>
          <div className="flex-1 h-px bg-[#e4e0d4] dark:bg-dark-surface"/>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate className="space-y-3 sm:space-y-4">

          {/* Full name */}
          <div>
            <label htmlFor="su-name" className="block text-xs sm:text-sm font-medium text-[#1a3a35] dark:text-dark-text mb-1">Full name</label>
            <input
              id="su-name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => touch("name")}
              placeholder="Jane Smith"
              className={`w-full bg-white dark:bg-dark-surface border rounded-xl px-4 py-2 sm:py-2.5 text-xs sm:text-sm text-[#1a3a35] dark:text-dark-text placeholder-[#b0ad9e] dark:placeholder-[#5f7d76] outline-none transition-all ${
                nameErr
                  ? "border-red-400 focus:border-red-400 focus:ring-2 focus:ring-red-100"
                  : "border-[#dedad0] dark:border-dark-border focus:border-[#4a7c6f] focus:ring-2 focus:ring-[#4a7c6f]/10"
              }`}
            />
            {nameErr && <InlineError msg={nameErr}/>}
          </div>

          {/* Email */}
          <div>
            <label htmlFor="su-email" className="block text-xs sm:text-sm font-medium text-[#1a3a35] dark:text-dark-text mb-1">Email</label>
            <input
              id="su-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => touch("email")}
              placeholder="you@example.com"
              className={`w-full bg-white dark:bg-dark-surface border rounded-xl px-4 py-2 sm:py-2.5 text-xs sm:text-sm text-[#1a3a35] dark:text-dark-text placeholder-[#b0ad9e] dark:placeholder-[#5f7d76] outline-none transition-all ${
                emailErr
                  ? "border-red-400 focus:border-red-400 focus:ring-2 focus:ring-red-100"
                  : "border-[#dedad0] dark:border-dark-border focus:border-[#4a7c6f] focus:ring-2 focus:ring-[#4a7c6f]/10"
              }`}
            />
            {emailErr && <InlineError msg={emailErr}/>}
          </div>

          {/* Password */}
          <div>
            <label htmlFor="su-pw" className="block text-xs sm:text-sm font-medium text-[#1a3a35] dark:text-dark-text mb-1">Password</label>
            <div className="relative">
              <input
                id="su-pw"
                type={showPw ? "text" : "password"}
                autoComplete="new-password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                onBlur={() => touch("pw")}
                placeholder="Min. 8 characters"
                className={`w-full bg-white dark:bg-dark-surface border rounded-xl px-4 py-2 sm:py-2.5 pr-11 text-xs sm:text-sm text-[#1a3a35] dark:text-dark-text placeholder-[#b0ad9e] dark:placeholder-[#5f7d76] outline-none transition-all ${
                  pwErr
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
            {/* Strength bar — shown whenever password has text */}
            <PasswordStrength password={pw}/>
            {pwErr && <InlineError msg={pwErr}/>}
          </div>

          {/* Confirm password */}
          <div>
            <label htmlFor="su-confirm" className="block text-xs sm:text-sm font-medium text-[#1a3a35] dark:text-dark-text mb-1">Confirm password</label>
            <div className="relative">
              <input
                id="su-confirm"
                type={showConfirm ? "text" : "password"}
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                onBlur={() => touch("confirm")}
                placeholder="Re-enter your password"
                className={`w-full bg-white dark:bg-dark-surface border rounded-xl px-4 py-2 sm:py-2.5 pr-11 text-xs sm:text-sm text-[#1a3a35] dark:text-dark-text placeholder-[#b0ad9e] dark:placeholder-[#5f7d76] outline-none transition-all ${
                  confirmErr
                    ? "border-red-400 focus:border-red-400 focus:ring-2 focus:ring-red-100"
                    : confirmMatch
                      ? "border-[#4a7c6f] dark:border-[#4a7c6f] focus:border-[#4a7c6f] focus:ring-2 focus:ring-[#4a7c6f]/10"
                      : "border-[#dedad0] dark:border-dark-border focus:border-[#4a7c6f] focus:ring-2 focus:ring-[#4a7c6f]/10"
                }`}
              />
              {/* Right slot: match check OR show/hide toggle */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                {confirmMatch && <CheckIcon/>}
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  aria-label={showConfirm ? "Hide password" : "Show password"}
                  className="text-[#a09c8e] dark:text-[#7d9691] hover:text-[#1a3a35] dark:hover:text-dark-text transition-colors"
                >
                  <EyeIcon visible={showConfirm}/>
                </button>
              </div>
            </div>
            {confirmErr && <InlineError msg={confirmErr}/>}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || googleLoading}
            className="w-full flex items-center justify-center gap-2 bg-[#1a3a35] dark:bg-dark-surface-2 text-[#EDEADE] dark:text-dark-text text-xs sm:text-sm font-medium py-2 sm:py-2.5 rounded-xl hover:bg-[#2d5248] active:bg-[#132e29] transition-colors mt-1 sm:mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <><Spinner/> Creating account…</> : "Create account"}
          </button>
        </form>

        {/* Legal */}
        <p className="text-center text-xs text-[#a09c8e] dark:text-[#7d9691] mt-4 leading-relaxed">
          By creating an account, you agree to our{" "}
          <a href="#" className="underline hover:text-[#4a7c6f] transition-colors">Terms</a>
          {" "}and{" "}
          <a href="#" className="underline hover:text-[#4a7c6f] transition-colors">Privacy Policy</a>.
        </p>

        <p className="text-center text-xs sm:text-sm text-[#6b6b6b] dark:text-dark-muted mt-4">
          Already have an account?{" "}
          <Link href="/signin" className="text-[#1a3a35] dark:text-dark-text font-medium hover:underline">Sign in</Link>
        </p>
      </div>

      <Link href="/" className="mt-6 text-xs text-black dark:text-dark-text hover:text-[#19311f] dark:hover:text-[#9fc2b8] transition-colors">
        ← Back to home
      </Link>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={<FullPageLoader />}>
      <SignUpContent/>
    </Suspense>
  );
}
