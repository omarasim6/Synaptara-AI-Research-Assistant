"use client";

import { useEffect, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { useAvatar } from "@/providers/AvatarProvider";

interface Props {
  firstName: string;
  email: string;
  /**
   * On mobile, replace the round avatar with a "back to dashboard" button
   * instead of the dropdown menu. Defaults to true. Pass `false` on the
   * dashboard itself, since there's nowhere to "go back" to.
   */
  showBackOnMobile?: boolean;
}

const MenuIcon = ({ icon }: { icon: "profile" | "settings" | "billing" | "help" | "signout" }) => {
  const paths: Record<typeof icon, React.ReactNode> = {
    profile: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="4.5" r="2.5" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M1.5 12.5c0-2.485 2.462-4.5 5.5-4.5s5.5 2.015 5.5 4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
    settings: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="7" r="2" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M7 1v1.5M7 11.5V13M1 7h1.5M11.5 7H13M2.636 2.636l1.06 1.06M10.304 10.304l1.06 1.06M2.636 11.364l1.06-1.06M10.304 3.696l1.06-1.06" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
    billing: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <rect x="1" y="3" width="12" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M1 6h12" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M4 9h2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
    help: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M5.5 5.5a1.5 1.5 0 012.6 1c0 1-1.1 1.25-1.1 2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        <circle cx="7" cy="10.5" r="0.6" fill="currentColor"/>
      </svg>
    ),
    signout: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M5 2H2v10h3M9 4.5L12 7l-3 2.5M6 7h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  };
  return <span className="flex-shrink-0">{paths[icon]}</span>;
};

export default function ProfileDropdown({ firstName, email, showBackOnMobile = true }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  // Always read the live avatar from the backend-backed provider, never from
  // the session cookie — see AvatarProvider.tsx for why.
  const { avatarUrl: image } = useAvatar();

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const initial = firstName[0]?.toUpperCase() ?? "?";

  return (
    <>
      {/* Mobile: back-to-dashboard button in place of the profile menu.
          Hidden from sm: up, where the avatar/dropdown below takes over. */}
      {showBackOnMobile && (
        <Link
          href="/dashboard"
          aria-label="Back to dashboard"
          className="sm:hidden flex items-center gap-1.5 px-2.5 h-8 rounded-full text-xs font-medium text-[#1a3a35] dark:text-dark-text bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 transition-colors flex-shrink-0"
        >
          <svg width="13" height="13" viewBox="0 0 15 15" fill="none">
            <path d="M9.5 3L5.5 7.5l4 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Dashboard
        </Link>
      )}

      {/* Desktop (always) / Mobile (only when showBackOnMobile is false):
          the avatar button that opens the full dropdown. */}
      <div ref={ref} className={`relative ${showBackOnMobile ? "hidden sm:block" : ""}`}>
        {/* Avatar button */}
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label="Open profile menu"
          aria-expanded={open}
          className={`w-8 h-8 rounded-full flex items-center justify-center text-[#EDEADE] dark:text-dark-text text-xs font-semibold flex-shrink-0 transition-all ring-2 ring-offset-1 ring-offset-[#EDEADE] overflow-hidden ${
            open
              ? "bg-[#2d5248] dark:bg-[#375f54] ring-[#1a3a35] dark:ring-white/30"
              : "bg-[#1a3a35] dark:bg-dark-surface-2 ring-transparent hover:ring-[#1a3a35]/40"
          }`}
        >
          {image ? (
            <Image src={image} alt="" width={32} height={32} unoptimized className="w-full h-full object-cover" />
          ) : (
            initial
          )}
        </button>

        {/* Dropdown */}
        {open && (
          <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-dark-surface border border-[#e4e0d4] dark:border-dark-border rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.10)] z-[300] overflow-hidden">

            {/* User info header */}
            <div className="px-4 py-3 border-b border-[#f0ece4] dark:border-dark-border">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#1a3a35] dark:bg-dark-surface-2 flex items-center justify-center text-[#EDEADE] dark:text-dark-text text-sm font-semibold flex-shrink-0 overflow-hidden">
                  {image ? (
                    <Image src={image} alt="" width={36} height={36} unoptimized className="w-full h-full object-cover" />
                  ) : (
                    initial
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#1a3a35] dark:text-dark-text truncate">{firstName}</p>
                  <p className="text-xs text-[#4a7c6f] dark:text-dark-muted truncate">{email}</p>
                </div>
              </div>
            </div>

            {/* Menu items */}
            <div className="py-1.5 px-1.5 space-y-0.5">
              <Link
                href="/profile"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-[#1a3a35] dark:text-dark-text hover:bg-[#f5f3ee] dark:hover:bg-white/5 transition-colors"
              >
                <MenuIcon icon="profile" /> Profile
              </Link>
              <Link
                href="/profile?tab=settings"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-[#1a3a35] dark:text-dark-text hover:bg-[#f5f3ee] dark:hover:bg-white/5 transition-colors"
              >
                <MenuIcon icon="settings" /> Settings
              </Link>
              <Link
                href="/pricing"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-[#1a3a35] dark:text-dark-text hover:bg-[#f5f3ee] dark:hover:bg-white/5 transition-colors"
              >
                <MenuIcon icon="billing" /> Plan & Billing
              </Link>
              <Link
                href="/support"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-[#1a3a35] dark:text-dark-text hover:bg-[#f5f3ee] dark:hover:bg-white/5 transition-colors"
              >
                <MenuIcon icon="help" /> Help & Support
              </Link>
            </div>

            {/* Sign out */}
            <div className="border-t border-[#f0ece4] dark:border-dark-border py-1.5 px-1.5">
              <button
                onClick={() => { setOpen(false); signOut({ callbackUrl: "/" }); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <MenuIcon icon="signout" /> Sign out
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
