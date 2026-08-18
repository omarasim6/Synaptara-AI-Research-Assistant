"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSession, signOut } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";

/* ─── Nav data ───────────────────────────────────────────────────────────── */
const NAV = {
  features: [
    { title: "Reports",  desc: "In-depth, automated literature reviews",  href: "/dashboard?tab=reports" },
    { title: "Search",   desc: "AI search over scientific papers",         href: "/search" },
    { title: "Library",  desc: "A home for all of your research",         href: "/dashboard?tab=library" },
    { title: "Alerts",   desc: "Don't miss out on new research",          href: "/dashboard?tab=alerts" },
  ],
  sources: [
    { title: "arXiv",     desc: "Open-access research papers" },
    { title: "PubMed",    desc: "Biomedical literature database" },
    { title: "OpenAI",    desc: "Latest AI research and releases" },
    { title: "DeepMind",  desc: "Cutting-edge AI science" },
  ],
  reports: [
    { title: "Literature Reviews", desc: "Comprehensive automated reviews" },
    { title: "Summaries",         desc: "Quick paper digests" },
    { title: "Citations",         desc: "Auto-generated references" },
    { title: "Exports",           desc: "PDF, Word, and BibTeX export" },
  ],
} as const;

type DropdownKey = keyof typeof NAV;

/* ─── Chevron ────────────────────────────────────────────────────────────── */
const Chevron = ({ open }: { open: boolean }) => (
  <svg
    width="13" height="13" viewBox="0 0 14 14" fill="none"
    style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.18s ease" }}
  >
    <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

/* ─── Desktop dropdown panel ─────────────────────────────────────────────── */
type NavItem = { title: string; desc: string; href?: string };

function DesktopDropdown({ items }: { items: readonly NavItem[] }) {
  return (
    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 bg-white dark:bg-dark-surface border border-[#e8e4d8] dark:border-dark-border rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.10)] py-2 px-2 z-[200]">
      {items.map((item) => {
        const inner = (
          <div className="px-3 py-2.5 rounded-xl hover:bg-[#f5f3ee] dark:hover:bg-white/5 active:bg-[#ede9e1] transition-colors">
            <p className="font-semibold text-[#1a3a35] dark:text-dark-text text-sm leading-snug">{item.title}</p>
            <p className="text-[#375f54] dark:text-[#9fc2b8] text-xs mt-0.5 leading-relaxed">{item.desc}</p>
          </div>
        );
        return item.href ? (
          <Link key={item.title} href={item.href}>{inner}</Link>
        ) : (
          <div key={item.title}>{inner}</div>
        );
      })}
    </div>
  );
}

/* ─── Main Navbar ────────────────────────────────────────────────────────── */
export default function Navbar() {
  const { data: session, status } = useSession();
  const pathname  = usePathname();
  const router    = useRouter();

  const [hovered,    setHovered]    = useState<DropdownKey | null>(null);
  const closeTimer                   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileTab,  setMobileTab]  = useState<DropdownKey | null>(null);

  useEffect(() => { setMobileOpen(false); setMobileTab(null); }, [pathname]);
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);
  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current); }, []);

  const onEnter = (key: DropdownKey) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setHovered(key);
  };
  const onLeave = () => { closeTimer.current = setTimeout(() => setHovered(null), 120); };

  /* Scroll to #about — works on any page (navigates home first if needed) */
  const handleAboutClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setMobileOpen(false);

    const scrollToSection = () => {
      const el = document.getElementById("about");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    };

    if (pathname === "/") {
      scrollToSection();
    } else {
      router.push("/");
      // Give the page a moment to mount, then scroll
      setTimeout(scrollToSection, 400);
    }
  };

  return (
    <nav className="w-full bg-[#EDEADE] dark:bg-dark-bg relative z-40">

      {/* ── Main bar ── */}
      <div className="px-4 sm:px-8 h-16 flex items-center justify-between">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <Image src="/icon.png" alt="Synaptara logo" width={32} height={32} className="rounded-xl" priority />
          <span className="font-display text-[1.15rem] font-semibold text-[#1a3a35] dark:text-dark-text leading-none">
            Synaptara
          </span>
        </Link>

        {/* ── Desktop centre nav ── */}
        <div className="hidden md:flex items-center gap-1">
          {(["features", "sources", "reports"] as DropdownKey[]).map((key) => (
            <div key={key} className="relative" onMouseEnter={() => onEnter(key)} onMouseLeave={onLeave}>
              <button className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                hovered === key
                  ? "text-[#1a3a35] dark:text-dark-text bg-black/5"
                  : "text-[#41786a] dark:text-[#68a595] hover:text-[#1a3a35] dark:hover:text-dark-text hover:bg-black/5"
              }`}>
                {key.charAt(0).toUpperCase() + key.slice(1)}
                <Chevron open={hovered === key} />
              </button>
              {hovered === key && <DesktopDropdown items={NAV[key]} />}
            </div>
          ))}

          {/* Pricing */}
          <Link
            href="/pricing"
            className="px-3 py-2 rounded-lg text-sm font-medium text-[#4a7c6f] dark:text-dark-muted hover:text-[#1a3a35] dark:hover:text-dark-text hover:bg-black/5 transition-colors"
          >
            Pricing
          </Link>

          {/* ── About (scroll link) ── */}
          <a
            href="#about"
            onClick={handleAboutClick}
            className="px-3 py-2 rounded-lg text-sm font-medium text-[#4a7c6f] dark:text-dark-muted hover:text-[#1a3a35] dark:hover:text-dark-text hover:bg-black/5 transition-colors cursor-pointer"
          >
            About
          </a>
        </div>

        {/* ── Desktop auth ── */}
        <div className="hidden md:flex items-center gap-3 shrink-0">
          {status === "loading" ? (
            <div className="w-16 h-8 bg-[#dedad0] dark:bg-dark-border rounded-lg animate-pulse" />
          ) : session ? (
            <>
              <span className="text-[#1a3a35] dark:text-dark-text text-sm font-medium">
                {session.user?.name?.split(" ")[0] ?? "Account"}
              </span>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="bg-[#1a3a35] dark:bg-dark-surface-2 text-[#EDEADE] dark:text-dark-text text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#2d5248] transition-colors"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/signin" className="text-[#4a7c6f] dark:text-dark-muted text-sm font-medium hover:text-[#1a3a35] dark:hover:text-dark-text transition-colors">
                Sign in
              </Link>
              <Link href="/signup" className="bg-[#1a3a35] dark:bg-dark-surface-2 text-[#EDEADE] dark:text-dark-text text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#2d5248] transition-colors">
                Sign up
              </Link>
            </>
          )}
        </div>

        {/* ── Hamburger ── */}
        <button
          onClick={() => setMobileOpen((v) => !v)}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
          className="md:hidden p-2 -mr-1 text-[#1a3a35] dark:text-dark-text rounded-lg hover:bg-black/5 transition-colors"
        >
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            {mobileOpen ? (
              <>
                <path d="M5 5l12 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M17 5L5 17"  stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </>
            ) : (
              <path d="M3 6h16M3 11h16M3 16h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            )}
          </svg>
        </button>
      </div>

      {/* ── Mobile menu panel ── */}
      {mobileOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 z-[200] bg-[#EDEADE] dark:bg-dark-bg border-t border-[#e0ddd0] dark:border-dark-border shadow-lg max-h-[calc(100vh-4rem)] overflow-y-auto">
          <div className="px-4 py-3 space-y-0.5">

            {(["features", "sources", "reports"] as DropdownKey[]).map((key) => (
              <div key={key}>
                <button
                  onClick={() => setMobileTab(mobileTab === key ? null : key)}
                  className="w-full flex items-center justify-between px-3 py-3 rounded-xl text-sm font-medium text-[#1a3a35] dark:text-dark-text hover:bg-black/5 transition-colors"
                >
                  {key.charAt(0).toUpperCase() + key.slice(1)}
                  <Chevron open={mobileTab === key} />
                </button>

                {mobileTab === key && (
                  <div className="mt-0.5 mb-2 ml-3 space-y-0.5">
                    {NAV[key].map((item) => {
                      const inner = (
                        <div className="px-3 py-2.5 rounded-xl hover:bg-black/5 transition-colors">
                          <p className="font-semibold text-[#1a3a35] dark:text-dark-text text-sm">{item.title}</p>
                          <p className="text-[#4a7c6f] dark:text-dark-muted text-xs mt-0.5 leading-relaxed">{item.desc}</p>
                        </div>
                      );
                      return "href" in item && item.href ? (
                        <Link key={item.title} href={item.href} onClick={() => setMobileOpen(false)}>
                          {inner}
                        </Link>
                      ) : (
                        <div key={item.title}>{inner}</div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}

            {/* Pricing */}
            <Link
              href="/pricing"
              onClick={() => setMobileOpen(false)}
              className="flex items-center px-3 py-3 rounded-xl text-sm font-medium text-[#1a3a35] dark:text-dark-text hover:bg-black/5 transition-colors"
            >
              Pricing
            </Link>

            {/* About — mobile */}
            <a
              href="#about"
              onClick={handleAboutClick}
              className="flex items-center px-3 py-3 rounded-xl text-sm font-medium text-[#1a3a35] dark:text-dark-text hover:bg-black/5 transition-colors cursor-pointer"
            >
              About
            </a>

            {/* Auth */}
            <div className="pt-3 mt-1 border-t border-[#e0ddd0] dark:border-dark-border space-y-2">
              {status === "loading" ? (
                <div className="h-10 bg-[#dedad0] dark:bg-dark-border rounded-xl animate-pulse" />
              ) : session ? (
                <>
                  <p className="px-3 py-2 text-sm font-medium text-[#1a3a35] dark:text-dark-text">
                    Signed in as {session.user?.name?.split(" ")[0] ?? "you"}
                  </p>
                  <button
                    onClick={() => { signOut({ callbackUrl: "/" }); setMobileOpen(false); }}
                    className="w-full bg-[#1a3a35] dark:bg-dark-surface-2 text-[#EDEADE] dark:text-dark-text text-sm font-medium py-2.5 rounded-xl hover:bg-[#2d5248] transition-colors"
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/signin"
                    onClick={() => setMobileOpen(false)}
                    className="block text-center py-2.5 rounded-xl text-sm font-medium text-[#1a3a35] dark:text-dark-text hover:bg-black/5 transition-colors border border-[#c8c4b4] dark:border-dark-border"
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/signup"
                    onClick={() => setMobileOpen(false)}
                    className="block text-center py-2.5 rounded-xl text-sm font-medium bg-[#1a3a35] dark:bg-dark-surface-2 text-[#EDEADE] dark:text-dark-text hover:bg-[#2d5248] transition-colors"
                  >
                    Sign up
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
