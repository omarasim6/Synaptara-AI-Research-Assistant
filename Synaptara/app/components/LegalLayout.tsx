"use client";

import Link from "next/link";
import Image from "next/image";

interface Section {
  heading: string;
  body: string | string[];
}

interface Props {
  title: string;
  lastUpdated: string;
  intro: string;
  sections: Section[];
}

export default function LegalLayout({ title, lastUpdated, intro, sections }: Props) {
  return (
    <div className="min-h-screen bg-[#EDEADE] dark:bg-dark-bg flex flex-col">

      {/* ── Minimal nav ─────────────────────────────────────────────────── */}
      <header className="w-full bg-[#EDEADE] dark:bg-dark-bg border-b border-[#dedad0] dark:border-dark-border px-4 sm:px-8 h-14 flex items-center justify-between sticky top-0 z-30">
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/icon.png" alt="Synaptara" width={28} height={28} className="rounded-lg" priority />
          <span className="font-display text-[1.1rem] font-semibold text-[#1a3a35] dark:text-dark-text">Synaptara</span>
        </Link>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-[#1a3a35] dark:text-dark-text hover:opacity-60 transition-opacity"
        >
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <path d="M9.5 3L5.5 7.5l4 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back
        </Link>
      </header>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <main className="flex-1 w-full max-w-3xl mx-auto px-5 sm:px-8 py-12 sm:py-16">

        {/* Title + date */}
        <h1 className="font-display text-4xl sm:text-5xl text-[#1a3a35] dark:text-dark-text leading-tight mb-3">
          {title}
        </h1>
        <p className="text-sm text-[#4a7c6f] dark:text-dark-muted mb-8 sm:mb-10">Last updated: {lastUpdated}</p>

        {/* Divider */}
        <div className="h-px bg-[#dedad0] dark:bg-dark-border mb-8 sm:mb-10" />

        {/* Intro paragraph */}
        <p className="text-[#1a3a35] dark:text-dark-text text-base leading-relaxed mb-8 sm:mb-10">{intro}</p>

        {/* Sections */}
        <div className="space-y-8 sm:space-y-10">
          {sections.map((s, i) => (
            <div key={i}>
              <h2 className="font-display text-xl sm:text-2xl text-[#1a3a35] dark:text-dark-text mb-3">{s.heading}</h2>
              {Array.isArray(s.body) ? (
                <div className="space-y-3">
                  {s.body.map((para, j) => (
                    <p key={j} className="text-[#375f54] dark:text-[#9fc2b8] text-base leading-relaxed">{para}</p>
                  ))}
                </div>
              ) : (
                <p className="text-[#375f54] dark:text-[#9fc2b8] text-base leading-relaxed">{s.body}</p>
              )}
            </div>
          ))}
        </div>

        {/* Footer note */}
        <div className="mt-12 sm:mt-16 pt-8 border-t border-[#dedad0] dark:border-dark-border">
          <p className="text-sm text-[#4a7c6f] dark:text-dark-muted">
            Questions about this policy?{" "}
            <a href="mailto:legal@synaptara.com" className="underline underline-offset-2 hover:text-[#1a3a35] dark:hover:text-dark-text transition-colors">
              Contact us at legal@synaptara.com
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
