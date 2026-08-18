"use client";

import { useEffect, useState, Suspense, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import ProfileDropdown from "@/app/components/ProfileDropdown";
import FullPageLoader from "@/app/components/FullPageLoader";
import { useToast } from "@/providers/ToastProvider";
import { searchApi, papersApi, type SearchResultItem, type SavedPaperOut } from "@/lib/api";

const SUGGESTED = [
  "Transformer attention mechanisms",
  "LLM reasoning benchmarks",
  "Diffusion model architectures",
  "Reinforcement learning from human feedback",
  "Multimodal vision-language models",
];

/* ── Icons ──────────────────────────────────────────────────────────────── */
const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const ArrowIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M2.5 7h9M8 3.5L11.5 7 8 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const ExternalIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path d="M5 2H2v8h8V7M7 1h4v4M6 6l5-5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const FilterIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M1.5 3.5h11M3.5 7h7M5.5 10.5h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const SOURCE_COLORS: Record<string, string> = {
  arXiv:     "bg-blue-50 text-blue-700 border-blue-200",
  OpenAI:    "bg-purple-50 text-purple-700 border-purple-200",
  Anthropic: "bg-orange-50 text-orange-700 border-orange-200",
  DeepMind:  "bg-teal-50 text-teal-700 border-teal-200",
  PubMed:    "bg-green-50 text-green-700 border-green-200",
};

/* ── Result card ─────────────────────────────────────────────────────────── */
function ResultCard({
  result,
  index,
  token,
  savedPaperIds,
  onSave,
  onUnsave,
}: {
  result: SearchResultItem;
  index: number;
  token: string;
  savedPaperIds: Map<string, string>;
  onSave: (paper: SearchResultItem, id: string) => void;
  onUnsave: (paper: SearchResultItem) => void;
}) {
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const savedId = savedPaperIds.get(result.title);
  const isSaved = savedId !== undefined;
  const color = SOURCE_COLORS[result.source] ?? "bg-[#f5f3ee] dark:bg-dark-surface text-[#4a7c6f] dark:text-dark-muted border-[#e4e0d4] dark:border-dark-border";

  const handleSaveToggle = async () => {
    if (saving) return;
    setSaving(true);
    try {
      if (!isSaved) {
        const saved = await papersApi.save(token, {
          title: result.title,
          authors: result.authors,
          source: result.source,
          year: result.year,
          tag: result.tag,
          summary: result.summary,
          paper_url: result.paper_url ?? null,
        });
        onSave(result, saved.id);
        toast.success("Saved ✓");
      } else {
        await papersApi.remove(token, savedId);
        onUnsave(result);
        toast.success("Removed from Library");
      }
    } catch {
      toast.error(isSaved ? "Couldn't remove the paper" : "Couldn't save the paper");
    }
    finally { setSaving(false); }
  };

  return (
    <div
      className="bg-white dark:bg-dark-surface border border-[#e4e0d4] dark:border-dark-border rounded-2xl p-5 sm:p-6 hover:border-[#c8c4b4] transition-all group"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${color}`}>
            {result.source}
          </span>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#f5f3ee] dark:bg-dark-surface text-[#4a7c6f] dark:text-dark-muted border border-[#e4e0d4] dark:border-dark-border">
            {result.tag}
          </span>
          <span className="text-xs text-[#a09c8e] dark:text-[#7d9691]">{result.year}</span>
        </div>
        <button
          onClick={handleSaveToggle}
          disabled={saving}
          className={`flex-shrink-0 p-1.5 rounded-lg transition-colors disabled:opacity-50 ${
            isSaved
              ? "text-[#1a3a35] dark:text-dark-text bg-[#f5f3ee] dark:bg-dark-surface"
              : "text-[#c8c4b4] dark:text-[#5f7d76] hover:text-[#4a7c6f] hover:bg-[#f5f3ee] dark:hover:bg-white/5"
          }`}
          title={isSaved ? "Saved to library" : "Save to library"}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill={isSaved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.4">
            <path d="M2 2h10v11l-5-3-5 3V2z" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      <h3 className="font-semibold text-[#1a3a35] dark:text-dark-text text-sm sm:text-base leading-snug mb-1 group-hover:text-[#2d5248] transition-colors">
        {result.title}
      </h3>
      <p className="text-xs text-[#4a7c6f] dark:text-dark-muted mb-3">{result.authors}</p>
      <p className="text-sm text-[#4a7c6f] dark:text-dark-muted leading-relaxed">{result.summary}</p>

      <div className="mt-4 flex items-center gap-3">
        {result.paper_url ? (
          <a
            href={result.paper_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-[#1a3a35] dark:text-dark-text hover:text-[#2d5248] flex items-center gap-1 transition-colors"
          >
            Read paper <ExternalIcon />
          </a>
        ) : (
          <button className="text-xs font-medium text-[#1a3a35] dark:text-dark-text hover:text-[#2d5248] flex items-center gap-1 transition-colors">
            Read paper <ExternalIcon />
          </button>
        )}
        <button className="text-xs font-medium text-[#4a7c6f] dark:text-dark-muted hover:text-[#1a3a35] dark:hover:text-dark-text transition-colors">
          Cite
        </button>
        <button className="text-xs font-medium text-[#4a7c6f] dark:text-dark-muted hover:text-[#1a3a35] dark:hover:text-dark-text transition-colors">
          Similar papers
        </button>
      </div>
    </div>
  );
}

/* ── Main search content ─────────────────────────────────────────────────── */
function SearchContent() {
  const searchParams  = useSearchParams();
  const router        = useRouter();
  const { data: session, status } = useSession();

  const [query, setQuery]           = useState("");
  const [inputVal, setInputVal]     = useState("");
  const [isLoading, setIsLoading]   = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [results, setResults]       = useState<SearchResultItem[]>([]);
  const [activeFilter, setActiveFilter] = useState("All");
  const [sidebarOpen, setSidebarOpen]   = useState(false);
  const [savedTitles, setSavedTitles]   = useState<Map<string, string>>(new Map());
  const [error, setError]           = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen]   = useState(false);
  const [yearFilter, setYearFilter]     = useState("All");
  const [sortBy, setSortBy]             = useState<"relevance" | "year">("relevance");

  const filters = ["All", "arXiv", "OpenAI", "Anthropic", "DeepMind", "PubMed"];
  const yearOptions = ["All", "2026", "2025", "2024", "2023", "Older"];
  const token = (session?.user as Record<string, unknown>)?.accessToken as string | undefined;

  // Pre-load saved papers (title -> id) so save/unsave buttons work correctly
  useEffect(() => {
    if (!token) return;
    papersApi.getSaved(token)
      .then((papers) => setSavedTitles(new Map(papers.map((p) => [p.title, p.id]))))
      .catch(() => {});
  }, [token]);

  const runSearch = useCallback(async (q: string, sourceFilter?: string) => {
    if (!token || !q.trim()) return;
    setIsLoading(true);
    setHasSearched(true);
    setError(null);
    try {
      const data = await searchApi.search(
        token,
        q,
        sourceFilter && sourceFilter !== "All" ? sourceFilter : undefined
      );
      setResults(data.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed. Please try again.");
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  /* Load query from the URL (?q=) */
  useEffect(() => {
    const qParam = searchParams.get("q");
    if (qParam) {
      setQuery(qParam);
      setInputVal(qParam);
      runSearch(qParam);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, token]);

  /* Redirect unauthenticated visitors */
  useEffect(() => {
    if (status === "unauthenticated") {
      const qParam = searchParams.get("q");
      const callbackUrl = qParam ? `/search?q=${encodeURIComponent(qParam)}` : "/search";
      router.replace(`/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
    }
  }, [status, router, searchParams]);

  function handleSearch() {
    if (!inputVal.trim()) return;
    setQuery(inputVal.trim());
    setActiveFilter("All");
    router.replace(`/search?q=${encodeURIComponent(inputVal.trim())}`);
    runSearch(inputVal.trim());
  }

  function handleFilterChange(f: string) {
    setActiveFilter(f);
    if (query) {
      runSearch(query, f === "All" ? undefined : f);
    }
  }

  function handleResetFilters() {
    setYearFilter("All");
    setSortBy("relevance");
  }

  const activeFilterCount =
    (yearFilter !== "All" ? 1 : 0) + (sortBy !== "relevance" ? 1 : 0);

  /* Client-side year filter + sort, applied on top of the server-side source filter */
  const displayedResults = (() => {
    let list = results;
    if (yearFilter !== "All") {
      list = list.filter((r) => {
        if (yearFilter === "Older") {
          const y = parseInt(r.year, 10);
          return !isNaN(y) && y < 2023;
        }
        return r.year === yearFilter;
      });
    }
    if (sortBy === "year") {
      list = [...list].sort((a, b) => {
        const ya = parseInt(a.year, 10) || 0;
        const yb = parseInt(b.year, 10) || 0;
        return yb - ya;
      });
    }
    return list;
  })();

  function handleSave(paper: SearchResultItem, id: string) {
    setSavedTitles((prev) => {
      const next = new Map(prev);
      next.set(paper.title, id);
      return next;
    });
  }

  function handleUnsave(paper: SearchResultItem) {
    setSavedTitles((prev) => {
      const next = new Map(prev);
      next.delete(paper.title);
      return next;
    });
  }

  const firstName = session?.user?.name?.split(" ")[0] ?? "Researcher";

  if (status === "loading" || status === "unauthenticated") {
    return <FullPageLoader label="Loading search…" />;
  }

  return (
    <div className="min-h-screen bg-[#EDEADE] dark:bg-dark-bg flex flex-col">

      {/* Top nav */}
      <header className="w-full bg-[#EDEADE] dark:bg-dark-bg border-b border-[#dedad0] dark:border-dark-border px-4 sm:px-6 h-14 flex items-center justify-between z-30 sticky top-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="lg:hidden p-1.5 text-[#1a3a35] dark:text-dark-text rounded-lg hover:bg-black/5 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M2 5h16M2 10h16M2 15h16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
            </svg>
          </button>
          <Link href="/" className="flex items-center gap-2">
            <Image src="/icon.png" alt="Synaptara" width={28} height={28} className="rounded-lg" />
            <span className="font-display text-lg font-semibold text-[#1a3a35] dark:text-dark-text">Synaptara</span>
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden sm:block text-sm text-[#4a7c6f] dark:text-dark-muted truncate max-w-[180px]">
            {session?.user?.email}
          </span>
          <ProfileDropdown firstName={firstName} email={session?.user?.email ?? ""} />
        </div>
      </header>

      <div className="flex flex-1 relative">
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/20 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Sidebar */}
        <aside className={`
          fixed lg:sticky top-14 left-0 h-[calc(100vh-3.5rem)] w-56 bg-[#EDEADE] dark:bg-dark-bg border-r border-[#dedad0] dark:border-dark-border
          flex flex-col z-20 transition-transform duration-200
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}>
          <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
            <Link href="/dashboard" onClick={() => setSidebarOpen(false)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[#4a7c6f] dark:text-dark-muted hover:text-[#1a3a35] dark:hover:text-dark-text hover:bg-black/5 transition-colors">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="1" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
                <rect x="9" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
                <rect x="1" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
                <rect x="9" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
              Overview
            </Link>
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium bg-[#1a3a35] dark:bg-dark-surface-2 text-[#EDEADE] dark:text-dark-text text-left">
              <SearchIcon />
              Search
            </button>
            <Link href="/dashboard?tab=reports" onClick={() => setSidebarOpen(false)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[#4a7c6f] dark:text-dark-muted hover:text-[#1a3a35] dark:hover:text-dark-text hover:bg-black/5 transition-colors">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="2" y="1" width="12" height="14" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M5 5h6M5 8h6M5 11h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              Reports
            </Link>
            <Link href="/dashboard?tab=library" onClick={() => setSidebarOpen(false)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[#4a7c6f] dark:text-dark-muted hover:text-[#1a3a35] dark:hover:text-dark-text hover:bg-black/5 transition-colors">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M2 3h3v10H2zM6.5 3h3v10h-3zM11 3l3 .5v9l-3-.5V3z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
              </svg>
              Library
            </Link>
            <Link href="/dashboard?tab=alerts" onClick={() => setSidebarOpen(false)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[#4a7c6f] dark:text-dark-muted hover:text-[#1a3a35] dark:hover:text-dark-text hover:bg-black/5 transition-colors">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 2a5 5 0 015 5v2.5l1.5 2H1.5L3 9.5V7a5 5 0 015-5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                <path d="M6.5 13.5a1.5 1.5 0 003 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              Alerts
            </Link>
          </div>
          <div className="p-3 border-t border-[#dedad0] dark:border-dark-border">
            <Link href="/pricing" className="block bg-[#1a3a35]/5 dark:bg-white/5 hover:bg-[#1a3a35]/10 border border-[#1a3a35]/10 dark:border-white/10 rounded-xl p-3 transition-colors">
              <p className="text-xs font-semibold text-[#1a3a35] dark:text-dark-text">Upgrade to Pro</p>
              <p className="text-xs text-[#4a7c6f] dark:text-dark-muted mt-0.5 leading-snug">Unlock unlimited research</p>
            </Link>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-6 sm:py-8 overflow-auto">
          <div className="max-w-4xl mx-auto space-y-6">

            {/* Search bar */}
            <div className="bg-[#1a3a35] dark:bg-dark-surface-2 rounded-2xl p-5 sm:p-6">
              <p className="text-[#99ada7] dark:text-[#8fada4] text-xs font-medium uppercase tracking-widest mb-3">AI Research Search</p>
              <div className="bg-[#EDEADE]/10 dark:bg-white/10 border border-[#EDEADE]/10 dark:border-white/10 rounded-xl px-4 py-3 flex items-center gap-3 focus-within:border-[#EDEADE]/30 transition-colors">
                <span className="text-[#99ada7] dark:text-[#8fada4]"><SearchIcon /></span>
                <input
                  type="text"
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="Ask anything — e.g. 'How do diffusion models work?'"
                  className="flex-1 bg-transparent text-[#EDEADE] dark:text-dark-text placeholder-[#99ada7]/60 dark:placeholder-[#5f7d76]/60 text-sm outline-none"
                  autoFocus
                />
                <button
                  onClick={handleSearch}
                  disabled={isLoading}
                  className="w-8 h-8 rounded-full bg-[#EDEADE]/15 dark:bg-white/10 hover:bg-[#EDEADE]/25 flex items-center justify-center transition-colors text-[#EDEADE] dark:text-dark-text flex-shrink-0 disabled:opacity-50"
                >
                  {isLoading
                    ? <div className="w-3.5 h-3.5 border-2 border-[#EDEADE] dark:border-white/15 border-t-transparent rounded-full animate-spin" />
                    : <ArrowIcon />}
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {SUGGESTED.map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      setInputVal(t);
                      setQuery(t);
                      setActiveFilter("All");
                      router.replace(`/search?q=${encodeURIComponent(t)}`);
                      runSearch(t);
                    }}
                    className="text-xs px-3 py-1.5 rounded-full bg-[#EDEADE]/10 dark:bg-white/10 hover:bg-[#EDEADE]/20 text-[#c5d4cf] dark:text-[#c5d4cf] transition-colors border border-[#EDEADE]/10 dark:border-white/10"
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Empty state */}
            {!hasSearched && !query && (
              <div className="bg-white dark:bg-dark-surface border border-[#e4e0d4] dark:border-dark-border rounded-2xl p-10 text-center">
                <div className="w-12 h-12 rounded-2xl bg-[#f5f3ee] dark:bg-dark-surface border border-[#e4e0d4] dark:border-dark-border flex items-center justify-center mx-auto mb-4 text-[#4a7c6f] dark:text-dark-muted">
                  <SearchIcon />
                </div>
                <p className="font-semibold text-[#1a3a35] dark:text-dark-text text-sm">Start your research</p>
                <p className="text-xs text-[#4a7c6f] dark:text-dark-muted mt-1">Type a question above or pick a suggested topic to get sourced summaries.</p>
              </div>
            )}

            {/* Results */}
            {hasSearched && (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    {isLoading
                      ? <p className="text-sm text-[#4a7c6f] dark:text-dark-muted">Searching across 50,000+ papers…</p>
                      : <p className="text-sm text-[#1a3a35] dark:text-dark-text">
                          <span className="font-semibold">{displayedResults.length} results</span>
                          <span className="text-[#4a7c6f] dark:text-dark-muted"> for </span>
                          <span className="font-semibold">&ldquo;{query}&rdquo;</span>
                        </p>
                    }
                  </div>
                  <div className="flex items-center gap-2 flex-wrap relative">
                    {filters.map((f) => (
                      <button
                        key={f}
                        onClick={() => handleFilterChange(f)}
                        className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                          activeFilter === f
                            ? "bg-[#1a3a35] dark:bg-dark-surface-2 text-[#EDEADE] dark:text-dark-text border-[#1a3a35] dark:border-dark-border"
                            : "bg-white dark:bg-dark-surface text-[#4a7c6f] dark:text-dark-muted border-[#e4e0d4] dark:border-dark-border hover:border-[#1a3a35] hover:text-[#1a3a35] dark:hover:text-dark-text"
                        }`}
                      >
                        {f}
                      </button>
                    ))}

                    <button
                      onClick={() => setFiltersOpen((v) => !v)}
                      aria-expanded={filtersOpen}
                      className={`flex items-center gap-1.5 text-xs px-3 py-1 rounded-full border transition-colors ${
                        filtersOpen || activeFilterCount > 0
                          ? "bg-[#1a3a35] dark:bg-dark-surface-2 text-[#EDEADE] dark:text-dark-text border-[#1a3a35] dark:border-dark-border"
                          : "bg-white dark:bg-dark-surface text-[#4a7c6f] dark:text-dark-muted border-[#e4e0d4] dark:border-dark-border hover:border-[#1a3a35] hover:text-[#1a3a35] dark:hover:text-dark-text"
                      }`}
                    >
                      <FilterIcon /> More filters
                      {activeFilterCount > 0 && (
                        <span className="ml-0.5 w-4 h-4 rounded-full bg-[#EDEADE]/20 dark:bg-white/15 flex items-center justify-center text-[10px] font-semibold">
                          {activeFilterCount}
                        </span>
                      )}
                    </button>

                    {filtersOpen && (
                      <>
                        <div className="fixed inset-0 z-30" onClick={() => setFiltersOpen(false)} />
                        <div className="absolute right-0 top-full mt-2 z-40 w-64 bg-white dark:bg-dark-surface border border-[#e4e0d4] dark:border-dark-border rounded-2xl shadow-lg p-4 space-y-4">
                          <div>
                            <p className="text-xs font-semibold text-[#1a3a35] dark:text-dark-text mb-2">Year</p>
                            <div className="flex flex-wrap gap-1.5">
                              {yearOptions.map((y) => (
                                <button
                                  key={y}
                                  onClick={() => setYearFilter(y)}
                                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                                    yearFilter === y
                                      ? "bg-[#1a3a35] dark:bg-dark-surface-2 text-[#EDEADE] dark:text-dark-text border-[#1a3a35] dark:border-dark-border"
                                      : "bg-[#f5f3ee] dark:bg-dark-surface text-[#4a7c6f] dark:text-dark-muted border-[#e4e0d4] dark:border-dark-border hover:border-[#1a3a35] hover:text-[#1a3a35] dark:hover:text-dark-text"
                                  }`}
                                >
                                  {y}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-[#1a3a35] dark:text-dark-text mb-2">Sort by</p>
                            <div className="flex flex-wrap gap-1.5">
                              {([
                                { key: "relevance", label: "Relevance" },
                                { key: "year", label: "Newest first" },
                              ] as const).map((opt) => (
                                <button
                                  key={opt.key}
                                  onClick={() => setSortBy(opt.key)}
                                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                                    sortBy === opt.key
                                      ? "bg-[#1a3a35] dark:bg-dark-surface-2 text-[#EDEADE] dark:text-dark-text border-[#1a3a35] dark:border-dark-border"
                                      : "bg-[#f5f3ee] dark:bg-dark-surface text-[#4a7c6f] dark:text-dark-muted border-[#e4e0d4] dark:border-dark-border hover:border-[#1a3a35] hover:text-[#1a3a35] dark:hover:text-dark-text"
                                  }`}
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center justify-between pt-1 border-t border-[#e4e0d4] dark:border-dark-border">
                            <button
                              onClick={handleResetFilters}
                              disabled={activeFilterCount === 0}
                              className="text-xs font-medium text-[#4a7c6f] dark:text-dark-muted hover:text-[#1a3a35] dark:hover:text-dark-text disabled:opacity-40 disabled:cursor-not-allowed transition-colors pt-3"
                            >
                              Reset
                            </button>
                            <button
                              onClick={() => setFiltersOpen(false)}
                              className="text-xs font-medium bg-[#1a3a35] dark:bg-dark-surface-2 text-[#EDEADE] dark:text-dark-text px-3 py-1.5 rounded-lg hover:bg-[#2d5248] transition-colors mt-3"
                            >
                              Done
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {isLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="bg-white dark:bg-dark-surface border border-[#e4e0d4] dark:border-dark-border rounded-2xl p-6 animate-pulse">
                        <div className="flex gap-2 mb-3">
                          <div className="h-5 w-16 bg-[#e4e0d4] dark:bg-dark-surface rounded-full" />
                          <div className="h-5 w-20 bg-[#e4e0d4] dark:bg-dark-surface rounded-full" />
                        </div>
                        <div className="h-5 w-3/4 bg-[#e4e0d4] dark:bg-dark-surface rounded-lg mb-2" />
                        <div className="h-3 w-1/3 bg-[#e4e0d4] dark:bg-dark-surface rounded mb-3" />
                        <div className="space-y-2">
                          <div className="h-3 w-full bg-[#f5f3ee] dark:bg-dark-surface rounded" />
                          <div className="h-3 w-5/6 bg-[#f5f3ee] dark:bg-dark-surface rounded" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {displayedResults.map((result, i) => (
                      <ResultCard
                        key={`${result.title}-${i}`}
                        result={result}
                        index={i}
                        token={token ?? ""}
                        savedPaperIds={savedTitles}
                        onSave={handleSave}
                        onUnsave={handleUnsave}
                      />
                    ))}

                    {displayedResults.length === 0 && !error && (
                      <div className="bg-white dark:bg-dark-surface border border-[#e4e0d4] dark:border-dark-border rounded-2xl p-10 text-center">
                        <p className="text-sm font-medium text-[#1a3a35] dark:text-dark-text">No results found</p>
                        <p className="text-xs text-[#4a7c6f] dark:text-dark-muted mt-1">
                          {results.length > 0
                            ? "Try adjusting or resetting your filters."
                            : "Try a different search term or remove the source filter."}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#EDEADE] dark:bg-dark-bg flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#1a3a35] dark:border-dark-border border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}
