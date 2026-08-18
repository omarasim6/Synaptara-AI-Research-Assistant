"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import About from "./components/About";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  // Only true once we've confirmed the visitor is signed in and the redirect
  // to /dashboard has actually been kicked off — used to avoid a flash of
  // the marketing page for a split second before the redirect lands.
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      setRedirecting(true);
      router.replace("/dashboard");
    }
  }, [status, router]);

  // No full-page spinner: the landing page itself renders immediately for
  // everyone, including while the session is still resolving. Navbar shows
  // its own small skeleton pulse in the auth area while status === "loading",
  // so returning visitors don't see the page appear "broken" or blocked.
  return (
    <main className="min-h-screen bg-[#EDEADE] dark:bg-dark-bg flex flex-col">
      {/* Subtle, non-blocking indicator — only shown for the brief moment
          between confirming the user is signed in and the redirect landing. */}
      {redirecting && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-3 right-3 z-[500] flex items-center gap-2 bg-white dark:bg-dark-surface border border-[#e4e0d4] dark:border-dark-border rounded-full pl-2.5 pr-3.5 py-1.5 shadow-sm"
        >
          <span className="w-3.5 h-3.5 border-2 border-[#1a3a35] dark:border-dark-text border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-medium text-[#1a3a35] dark:text-dark-text">Taking you to your dashboard…</span>
        </div>
      )}
      <Navbar />
      <Hero />
      <About />
    </main>
  );
}
