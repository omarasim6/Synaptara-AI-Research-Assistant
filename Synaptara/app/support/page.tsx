"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import ProfileDropdown from "@/app/components/ProfileDropdown";
import FullPageLoader from "@/app/components/FullPageLoader";

/* ── Data ─────────────────────────────────────────────────────────────────── */

type Faq = { q: string; a: string };
type Category = { id: string; title: string; icon: React.ReactNode; faqs: Faq[] };

const Icons = {
  gettingStarted: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M9 1.5l2.1 4.4 4.9.7-3.5 3.4.8 4.9L9 12.6l-4.3 2.3.8-4.9L2 6.6l4.9-.7L9 1.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  ),
  search: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M12.2 12.2L16 16" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  ),
  billing: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect x="1.5" y="4" width="15" height="10" rx="2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M1.5 7.5h15" stroke="currentColor" strokeWidth="1.4" />
      <path d="M4.5 11h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  ),
  account: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="5.5" r="3" stroke="currentColor" strokeWidth="1.4" />
      <path d="M2.5 16c0-3.3 2.9-6 6.5-6s6.5 2.7 6.5 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  ),
  privacy: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M9 1.5l6.5 2.4v4.6c0 4.1-2.7 7.4-6.5 8.5-3.8-1.1-6.5-4.4-6.5-8.5V3.9L9 1.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M6.2 9.2l1.9 1.9 3.7-3.9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

const CATEGORIES: Category[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    icon: Icons.gettingStarted,
    faqs: [
      {
        q: "What is Synaptara?",
        a: "Synaptara is an AI research assistant that reads papers, blogs, and newsletters across sources like arXiv, PubMed, OpenAI, and DeepMind, then summarizes, organizes, and cites them for you — so you can cover more ground in less time.",
      },
      {
        q: "How do I run my first search?",
        a: "From your dashboard, open the Search tab and enter a topic, question, or keyword. You can optionally filter by source. Results include a summary, authors, source, and year, and you can save any result to your Library for later.",
      },
      {
        q: "Can I sign in with Google?",
        a: "Yes. On the sign-in page, choose \"Continue with Google.\" If your account was originally created with an email and password, use that method instead — or contact us if you'd like the accounts linked.",
      },
    ],
  },
  {
    id: "search",
    title: "Search & Reports",
    icon: Icons.search,
    faqs: [
      {
        q: "Where do search results come from?",
        a: "Synaptara aggregates results from academic and industry sources including arXiv, PubMed, OpenAI, and DeepMind. Each result is tagged with its source so you always know where a summary originated.",
      },
      {
        q: "How do I generate a report?",
        a: "Open the Reports tab from your dashboard and create a new report from a topic or a set of saved papers. Reports can include literature review-style summaries and citations, and can be exported once generated.",
      },
      {
        q: "Can I set up alerts for a topic?",
        a: "Yes. The Alerts tab lets you create a standing alert for a topic or source. When new matching research is published, it will appear as a notification in your dashboard.",
      },
    ],
  },
  {
    id: "billing",
    title: "Billing & Plans",
    icon: Icons.billing,
    faqs: [
      {
        q: "What's included in the Free plan?",
        a: "The Free plan includes a limited number of AI searches per month, limited source citations, and basic alerts. You can see your current usage under Profile → Plan & Billing.",
      },
      {
        q: "How do I add or update a payment method?",
        a: "Go to Profile → Plan & Billing → Payment Methods. You can add a new card, edit the holder name or expiry on an existing card, mark a card as primary, or remove a card entirely.",
      },
      {
        q: "How do I upgrade my plan?",
        a: "Visit the Pricing page from the navbar, or select \"Upgrade plan\" from the Plan & Billing tab in your profile, and choose the plan that fits your usage.",
      },
    ],
  },
  {
    id: "account",
    title: "Account & Settings",
    icon: Icons.account,
    faqs: [
      {
        q: "How do I change my display name?",
        a: "Go to Profile → Profile tab, update your name in the field provided, and save your changes.",
      },
      {
        q: "How do I delete my account?",
        a: "Go to Profile → Settings and choose \"Delete account.\" This permanently removes your searches, saved papers, reports, alerts, and payment methods, and cannot be undone.",
      },
      {
        q: "I forgot my password — what do I do?",
        a: "On the sign-in page, select \"Forgot password?\" beneath the password field. If you originally signed up with Google, use \"Continue with Google\" instead, since Google-linked accounts don't have a Synaptara password.",
      },
    ],
  },
  {
    id: "privacy",
    title: "Privacy & Data",
    icon: Icons.privacy,
    faqs: [
      {
        q: "Is my research data private?",
        a: "Yes. Your searches, saved papers, reports, and alerts are private to your account. See our Privacy Policy for full details on what we collect and how it's used.",
      },
      {
        q: "Do you store my full card number?",
        a: "No. Synaptara never stores full card numbers or CVVs. Only a brand, last 4 digits, expiry, and cardholder name are kept, for display purposes.",
      },
    ],
  },
];

const QUICK_LINKS = [
  { label: "Plan & Billing", href: "/profile?tab=billing" },
  { label: "Account Settings", href: "/profile?tab=settings" },
  { label: "Pricing", href: "/pricing" },
  { label: "Privacy Policy", href: "/legal/privacy" },
  { label: "Terms of Use", href: "/legal/terms" },
];

/* ── FAQ item ─────────────────────────────────────────────────────────────── */
function FaqItem({ faq, open, onToggle }: { faq: Faq; open: boolean; onToggle: () => void }) {
  return (
    <div className="border-b border-[#f0ece4] dark:border-dark-border last:border-b-0">
      <button
        onClick={onToggle}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-4 py-4 text-left"
      >
        <span className="text-sm font-medium text-[#1a3a35] dark:text-dark-text">{faq.q}</span>
        <svg
          width="14" height="14" viewBox="0 0 14 14" fill="none"
          className="shrink-0 text-[#4a7c6f] dark:text-dark-muted transition-transform"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        >
          <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <p className="text-sm text-[#375f54] dark:text-[#9fc2b8] leading-relaxed pb-4 pr-6">
          {faq.a}
        </p>
      )}
    </div>
  );
}

/* ── Category card ────────────────────────────────────────────────────────── */
function CategoryCard({
  category,
  highlighted,
  cardRef,
}: {
  category: Category;
  highlighted: boolean;
  cardRef?: React.RefObject<HTMLDivElement>;
}) {
  // If this card is highlighted (deep-linked), start with first FAQ open; otherwise first open too
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div
      id={category.id}
      ref={cardRef}
      className={`bg-white dark:bg-dark-surface border rounded-2xl p-6 transition-all duration-300 ${
        highlighted
          ? "border-[#4a7c6f] ring-2 ring-[#4a7c6f]/20 dark:border-[#4a7c6f] dark:ring-[#4a7c6f]/20"
          : "border-[#e4e0d4] dark:border-dark-border"
      }`}
    >
      <div className="flex items-center gap-2.5 mb-1 text-[#1a3a35] dark:text-dark-text">
        {category.icon}
        <h2 className="font-display text-lg sm:text-xl">{category.title}</h2>
      </div>
      <div className="mt-3">
        {category.faqs.map((faq, i) => (
          <FaqItem
            key={faq.q}
            faq={faq}
            open={openIndex === i}
            onToggle={() => setOpenIndex(openIndex === i ? null : i)}
          />
        ))}
      </div>
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────────── */
export default function SupportPage() {
  const { data: session, status } = useSession();
  const [query, setQuery] = useState("");

  // Detect the #billing (or any #section) hash on mount and scroll to it
  const billingRef = useRef<HTMLDivElement>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (!hash) return;

    setHighlightedId(hash);

    // Small delay so the DOM is fully painted before we scroll
    const timer = setTimeout(() => {
      const el = document.getElementById(hash);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 120);

    // Remove highlight ring after 2.5 s so it doesn't stay forever
    const clearTimer = setTimeout(() => setHighlightedId(null), 2500);

    return () => {
      clearTimeout(timer);
      clearTimeout(clearTimer);
    };
  }, []);

  if (status === "loading") {
    return <FullPageLoader label="Loading Help & Support…" />;
  }

  const firstName = session?.user?.name?.split(" ")[0] ?? "Researcher";
  const isAuthed = status === "authenticated";

  const normalizedQuery = query.trim().toLowerCase();
  const filteredCategories = normalizedQuery
    ? CATEGORIES.map((c) => ({
        ...c,
        faqs: c.faqs.filter(
          (f) => f.q.toLowerCase().includes(normalizedQuery) || f.a.toLowerCase().includes(normalizedQuery)
        ),
      })).filter((c) => c.faqs.length > 0)
    : CATEGORIES;

  return (
    <div className="min-h-screen bg-[#EDEADE] dark:bg-dark-bg flex flex-col">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="w-full bg-[#EDEADE] dark:bg-dark-bg border-b border-[#dedad0] dark:border-dark-border px-4 sm:px-8 h-14 flex items-center justify-between sticky top-0 z-30">
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/icon.png" alt="Synaptara" width={28} height={28} className="rounded-lg" priority />
          <span className="font-display text-[1.1rem] font-semibold text-[#1a3a35] dark:text-dark-text">Synaptara</span>
        </Link>

        {isAuthed ? (
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="hidden sm:inline-flex items-center gap-1.5 text-sm text-[#4a7c6f] dark:text-dark-muted hover:text-[#1a3a35] dark:hover:text-dark-text transition-colors"
            >
              ← Dashboard
            </Link>
            <ProfileDropdown firstName={firstName} email={session?.user?.email ?? ""} />
          </div>
        ) : (
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-[#1a3a35] dark:text-dark-text hover:opacity-60 transition-opacity"
          >
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <path d="M9.5 3L5.5 7.5l4 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back
          </Link>
        )}
      </header>

      {/* ── Content ────────────────────────────────────────────────────── */}
      <main className="flex-1 w-full max-w-3xl mx-auto px-5 sm:px-8 py-12 sm:py-16">
        <h1 className="font-display text-4xl sm:text-5xl text-[#1a3a35] dark:text-dark-text leading-tight mb-3 text-center">
          Help &amp; Support
        </h1>
        <p className="text-sm sm:text-base text-[#4a7c6f] dark:text-dark-muted text-center mb-8 sm:mb-10 max-w-xl mx-auto">
          Search our FAQs or browse by topic. Can&apos;t find what you need? Reach out and we&apos;ll get back to you.
        </p>

        {/* Search */}
        <div className="relative mb-8 sm:mb-10">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="absolute left-4 top-1/2 -translate-y-1/2 text-[#a09c8e] dark:text-[#7d9691]">
            <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.4" />
            <path d="M10.8 10.8L14 14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for help — e.g. billing, alerts, password"
            className="w-full bg-white dark:bg-dark-surface border border-[#dedad0] dark:border-dark-border rounded-xl pl-11 pr-4 py-3 text-sm text-[#1a3a35] dark:text-dark-text placeholder-[#b0ad9e] dark:placeholder-[#5f7d76] outline-none focus:border-[#4a7c6f] focus:ring-2 focus:ring-[#4a7c6f]/10 transition-all"
          />
        </div>

        {/* Quick links */}
        <div className="flex flex-wrap gap-2 mb-10 sm:mb-12">
          {QUICK_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-xs sm:text-sm font-medium text-[#1a3a35] dark:text-dark-text bg-white dark:bg-dark-surface border border-[#e4e0d4] dark:border-dark-border px-3.5 py-2 rounded-full hover:bg-[#f5f3ee] dark:hover:bg-white/5 transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* FAQ categories */}
        {filteredCategories.length > 0 ? (
          <div className="space-y-5 sm:space-y-6">
            {filteredCategories.map((category) => (
              <CategoryCard
                key={category.title}
                category={category}
                highlighted={highlightedId === category.id}
                cardRef={category.id === "billing" ? billingRef : undefined}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 border border-dashed border-[#dedad0] dark:border-dark-border rounded-2xl">
            <p className="text-sm font-medium text-[#1a3a35] dark:text-dark-text">No results for &ldquo;{query}&rdquo;</p>
            <p className="text-xs text-[#4a7c6f] dark:text-dark-muted mt-1">Try a different search, or contact us below.</p>
          </div>
        )}

        {/* Contact */}
        <div className="mt-12 sm:mt-16 bg-[#1a3a35] dark:bg-dark-surface-2 rounded-2xl p-6 sm:p-8 text-center">
          <p className="font-display text-xl sm:text-2xl text-[#EDEADE] dark:text-dark-text mb-2">
            Still need help?
          </p>
          <p className="text-sm text-[#99ada7] dark:text-[#8fada4] mb-6 max-w-md mx-auto">
            Our support team typically responds within one business day.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href="mailto:support@synaptara.com"
              className="inline-flex items-center gap-2 bg-[#EDEADE] dark:bg-dark-bg text-[#1a3a35] dark:text-dark-text text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-[#dedad0] transition-colors"
            >
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                <rect x="1" y="3" width="13" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
                <path d="M1.5 3.8L7.5 8l6-4.2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Email support@synaptara.com
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
