"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export default function Hero() {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { data: session } = useSession();

  const handleSearch = () => {
    if (!query.trim()) return;

    if (session) {
      // User is already logged in, redirect to search page
      router.push(`/search?q=${encodeURIComponent(query)}`);
    } else {
      // Embed the query in callbackUrl — it survives the OAuth round trip
      const searchUrl = `/search?q=${encodeURIComponent(query)}`;
      router.push(`/signin?callbackUrl=${encodeURIComponent(searchUrl)}`);
    }
  };

  const handleContainerClick = () => {
    inputRef.current?.focus();
  };

  return (
    <section className="flex flex-col items-center justify-center text-center px-4 sm:px-6 pt-16 sm:pt-24 pb-12 sm:pb-16">
      {/* Headline */}
      <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold text-[#1a3a35] dark:text-dark-text leading-tight max-w-4xl">
        Your AI Research Assistant
      </h1>

      {/* Subheadline */}
      <p className="mt-4 sm:mt-6 text-[#29423c] dark:text-dark-text text-base sm:text-lg md:text-xl max-w-xl leading-relaxed font-light">
        Synaptara reads every paper, blog, and newsletter so you don&apos;t
        have to &amp; then summarizes, organizes, and cites it for you.
      </p>

      {/* CTA Button */}
      <Link
        href="/signup"
        className="mt-8 sm:mt-10 inline-flex items-center gap-3 bg-[#1a3a35] dark:bg-dark-surface-2 text-[#EDEADE] dark:text-dark-text text-sm sm:text-base font-medium px-6 sm:px-8 py-3 sm:py-4 rounded-xl hover:bg-[#2d5248] transition-colors"
      >
        Try now
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path
            d="M3 8h10M9 4l4 4-4 4"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </Link>

      {/* Search bar */}
      <div className="mt-10 sm:mt-12 w-full max-w-2xl px-4 sm:px-0">
        <div
          onClick={handleContainerClick}
          className="bg-white dark:bg-dark-surface rounded-2xl shadow-sm border border-[#e0ddd0] dark:border-dark-border px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-end justify-between gap-4 sm:gap-0 min-h-auto sm:min-h-[150px] cursor-text hover:border-[#c8c4b4] transition-colors"
        >
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Ask a question about AI to get a sourced summary"
            className="flex-1 w-full bg-transparent text-[#1a3a35] dark:text-dark-text placeholder-[#b0ad9e] dark:placeholder-[#5f7d76] text-sm sm:text-base outline-none resize-none font-light"
          />
          <button
            onClick={handleSearch}
            className="sm:ml-4 w-10 h-10 rounded-full bg-[#41573b] dark:bg-[#41573b] hover:bg-[#1a3a35] flex items-center justify-center transition-colors group flex-shrink-0"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M3 8h10M9 4l4 4-4 4"
                stroke="#EDEADE"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        <p className="mt-6 sm:mt-8 text-[#58574e] dark:text-dark-muted text-xs sm:text-sm text-center leading-relaxed">
          Drawing on 50,000+ papers and releases from arXiv, OpenAI, Anthropic,
          DeepMind, and more; every answer comes with sources.
        </p>
      </div>
    </section>
  );
}
