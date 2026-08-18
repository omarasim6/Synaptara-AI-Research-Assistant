"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { PLAN_LIST } from "@/lib/plans";

export default function PricingPage() {
  const [tab, setTab] = useState<"individual" | "business">("individual");
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#EDEADE] dark:bg-dark-bg">
      {/* Back */}
      <div className="px-4 sm:px-8 pt-4 sm:pt-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-[#1a3a35] dark:text-dark-text text-xs sm:text-sm hover:opacity-70 transition-opacity"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M10 3L6 8l4 5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Back
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col items-center pt-8 sm:pt-10 pb-2 sm:pb-4 px-4 sm:px-6 text-center">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-4 sm:mb-6">
          <Image src="/icon.png" alt="Synaptara" width={32} height={32} className="rounded-xl" />
          <span className="font-display text-lg sm:text-2xl font-semibold text-[#1a3a35] dark:text-dark-text">
            Synaptara
          </span>
        </div>

        <h1 className="font-display text-3xl sm:text-5xl font-normal text-[#1a3a35] dark:text-dark-text">
          Pricing
        </h1>
        <p className="mt-2 sm:mt-3 text-xs sm:text-sm text-[#000000] dark:text-dark-text">
          See pricing for our{" "}
          <button
            onClick={() => setTab("individual")}
            className="underline hover:opacity-70"
          >
            individual
          </button>
          ,{" "}
          <button
            onClick={() => setTab("business")}
            className="underline hover:opacity-70"
          >
            business
          </button>
          , and enterprise plans.
        </p>

        {/* Tabs */}
        <div className="mt-4 sm:mt-6 bg-[#e0ddd0] dark:bg-dark-border rounded-full p-1 flex">
          <button
            onClick={() => setTab("individual")}
            className={`px-4 sm:px-6 py-2 rounded-full text-xs sm:text-sm font-medium transition-all ${
              tab === "individual"
                ? "bg-white dark:bg-dark-surface text-[#1a3a35] dark:text-dark-text shadow-sm"
                : "text-[#000000] dark:text-dark-text hover:text-[#1a3a35] dark:hover:text-dark-text"
            }`}
          >
            Individual
          </button>
          <button
            onClick={() => setTab("business")}
            className={`px-4 sm:px-6 py-2 rounded-full text-xs sm:text-sm font-medium transition-all ${
              tab === "business"
                ? "bg-white dark:bg-dark-surface text-[#1a3a35] dark:text-dark-text shadow-sm"
                : "text-[#000000] dark:text-dark-text hover:text-[#1a3a35] dark:hover:text-dark-text"
            }`}
          >
            Business &amp; Enterprise
          </button>
        </div>
      </div>

      {/* Plans */}
      {tab === "individual" ? (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PLAN_LIST.map((plan) => (
            <div
              key={plan.name}
              className="bg-[#f5f3ec] dark:bg-dark-surface border border-[#dedad0] dark:border-dark-border rounded-2xl p-4 sm:p-6 flex flex-col"
            >
              <div>
                <h3 className="text-[#1a3a35] dark:text-dark-text font-semibold text-sm sm:text-base">
                  {plan.name}
                </h3>
                <p className="text-[#4a7c6f] dark:text-dark-muted text-xs mt-1">{plan.tagline}</p>
              </div>

              <div className="mt-4">
                <span className="text-[#1a3a35] dark:text-dark-text font-semibold text-lg sm:text-2xl">
                  {plan.priceLabel}
                </span>
                <span className="text-[#4a7c6f] dark:text-dark-muted text-xs sm:text-sm"> / month</span>
              </div>

              <button
                onClick={() => router.push(`/checkout/${plan.id}`)}
                className="mt-4 w-full border border-[#c8c4b4] dark:border-dark-border text-[#1a3a35] dark:text-dark-text text-xs sm:text-sm font-medium py-2 sm:py-2.5 rounded-xl hover:bg-[#e0ddd0] dark:hover:bg-white/5 transition-colors"
              >
                {plan.cta} ›
              </button>

              <ul className="mt-6 space-y-2 sm:space-y-2.5 flex-1">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs sm:text-sm">
                    {i === 0 && plan.name !== "Free" ? (
                      <span className="text-[#1a3a35] dark:text-dark-text font-medium leading-snug">
                        {f}
                      </span>
                    ) : (
                      <>
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 14 14"
                          fill="none"
                          className="flex-shrink-0 mt-0.5"
                        >
                          <path
                            d="M2.5 7l3 3 6-6"
                            stroke="#4a7c6f"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        <span className="text-[#1a3a35] dark:text-dark-text leading-snug">{f}</span>
                      </>
                    )}
                  </li>
                ))}
              </ul>

              {plan.note && (
                <p className="mt-4 text-xs text-[#30413d] dark:text-dark-text">
                  {plan.note}{" "}
                  <a href="#" className="underline hover:opacity-70">
                    Learn more
                  </a>
                </p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
          <div className="bg-[#f6f1e3] dark:bg-dark-surface border border-[#dedad0] dark:border-dark-border rounded-2xl p-6 sm:p-10 text-center">
            <h3 className="font-semibold text-[#1a3a35] dark:text-dark-text text-base sm:text-lg">
              Business &amp; Enterprise
            </h3>
            <p className="mt-3 text-[#4a7c6f] dark:text-dark-muted text-xs sm:text-sm leading-relaxed max-w-sm mx-auto">
              Team and enterprise plans with admin controls, higher usage limits,
              and dedicated support are coming soon.
            </p>
            <button className="mt-6 bg-[#1a3a35] dark:bg-dark-surface-2 text-[#EDEADE] dark:text-dark-text text-xs sm:text-sm font-medium px-6 sm:px-8 py-2 sm:py-3 rounded-full hover:bg-[#2d5248] transition-colors">
              Contact sales
            </button>
          </div>
        </div>
      )}

      {/* Footer note */}
      <div className="text-center pb-8 sm:pb-12 text-xs sm:text-sm text-[#244f43] dark:text-[#9fc2b8] px-4">
        Have an existing plan? See{" "}
        <Link
          href="/support#billing"
          className="underline hover:opacity-70"
        >
          billing help
        </Link>
        .
      </div>
    </div>
  );
}
