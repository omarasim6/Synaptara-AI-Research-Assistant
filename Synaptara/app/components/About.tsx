"use client";

/* ─────────────────────────────────────────────────────────────────────────────
   About.tsx — OpenAI-footer-style About section for Synaptara
   Colours stay 100 % on-brand: cream #EDEADE · ink #1a3a35 · sage #4a7c6f
   ───────────────────────────────────────────────────────────────────────── */

import Link from "next/link";
import Image from "next/image";

/* ── Column data ─────────────────────────────────────────────────────────── */
const COLS = [
  {
    heading: "Product",
    links: [
      { label: "Search",    href: "/search" },
      { label: "Reports",   href: "/dashboard?tab=reports" },
      { label: "Library",   href: "/dashboard?tab=library" },
      { label: "Alerts",    href: "/dashboard?tab=alerts" },
      { label: "Pricing",   href: "/pricing" },
    ],
  },
  {
    heading: "Sources",
    links: [
      { label: "arXiv",     href: "https://arxiv.org/" },
      { label: "PubMed",    href: "https://pubmed.ncbi.nlm.nih.gov/" },
      { label: "OpenAI",    href: "https://openai.com/" },
      { label: "DeepMind",  href: "https://deepmind.com/" },
      { label: "Anthropic", href: "https://anthropic.com/" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Terms of Use",    href: "/legal/terms" },
      { label: "Privacy Policy",  href: "/legal/privacy" },
      { label: "Cookie Policy",   href: "/legal/cookies" },
      { label: "Other policies",  href: "/legal/other-policies" },
    ],
  },
] as const;

/* ── Social icons (inline SVG — zero extra deps) ─────────────────────────── */
const SocialIcons = () => (
  <div className="flex items-center gap-4">
    {/* YouTube */}
    <a href="https://www.youtube.com/@s3play75" aria-label="YouTube" className="text-[#EDEADE] hover:text-[#68a595] transition-colors">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
      </svg>
    </a>
    {/* Instagram */}
    <a href="https://www.instagram.com" aria-label="Instagram" className="text-[#EDEADE] hover:text-[#68a595] transition-colors">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.332.014 7.052.072 2.695.272.273 2.69.073 7.052.014 8.332 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.332 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.668-.072-4.948C23.73 2.7 21.31.273 16.949.073 15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
      </svg>
    </a>
    {/* WhatsApp */}
    <a href="https://wa.me/03195768857" aria-label="WhatsApp" className="text-[#EDEADE] hover:text-[#68a595] transition-colors">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.372-.01-.571-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
        <path d="M12.001 2C6.478 2 2 6.477 2 12c0 1.876.508 3.706 1.475 5.307L2.06 22l4.828-1.371A9.955 9.955 0 0012.001 22C17.523 22 22 17.523 22 12S17.523 2 12.001 2zm0 18.062a8.037 8.037 0 01-4.312-1.24l-.31-.184-3.116.884.897-3.024-.203-.319A8.03 8.03 0 013.938 12c0-4.442 3.62-8.062 8.063-8.062S20.063 7.558 20.063 12 16.443 20.062 12 20.062z"/>
      </svg>
    </a>
    {/* GitHub */}
    <a href="https://github.com/omarasim6" aria-label="GitHub" className="text-[#EDEADE] hover:text-[#68a595] transition-colors">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
      </svg>
    </a>
    {/* LinkedIn */}
    <a href="https://www.linkedin.com/in/omar-asim-2b716232b/" aria-label="LinkedIn" className="text-[#EDEADE] hover:text-[#68a595] transition-colors">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
      </svg>
    </a>
  </div>
);

/* ── Component ───────────────────────────────────────────────────────────── */
export default function About() {
  return (
    <section
      id="about"
      className="w-full bg-[#1a3a35] dark:bg-dark-surface-2 mt-16 sm:mt-24"
    >
      {/* ── Top grid ── */}
      <div className="max-w-7xl mx-auto px-6 sm:px-10 pt-14 pb-10">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-10">
          {COLS.map((col) => (
            <div key={col.heading}>
              {/* Column heading */}
              <p className="text-[#ffffff] dark:text-dark-text text-xs font-semibold uppercase tracking-widest mb-4 opacity-80">
                {col.heading}
              </p>

              {/* Links */}
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-[#99ada7] dark:text-[#8fada4] hover:text-[#dbd7c7] text-sm transition-colors leading-relaxed"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* ── Divider ── */}
      <div className="max-w-7xl mx-auto px-6 sm:px-10">
        <div className="h-px bg-[#EDEADE]/10 dark:bg-white/10" />
      </div>

      {/* ── Bottom bar ── */}
      <div className="max-w-7xl mx-auto px-6 sm:px-10 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">

        {/* Logo + copyright */}
        <div className="flex items-center gap-3">
          <Image
            src="/icon.png"
            alt="Synaptara logo"
            width={26}
            height={26}
            className="rounded-lg opacity-80"
          />
          <span className="text-[#EDEADE] dark:text-dark-text text-sm">
            Synaptara © {new Date().getFullYear()}
          </span>
        </div>

        {/* Social icons */}
        <SocialIcons />
      </div>
    </section>
  );
}
