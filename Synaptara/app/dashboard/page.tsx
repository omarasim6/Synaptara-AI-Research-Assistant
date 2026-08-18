"use client";

import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useCallback, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import ProfileDropdown from "@/app/components/ProfileDropdown";
import FullPageLoader from "@/app/components/FullPageLoader";
import { useToast } from "@/providers/ToastProvider";
import {
  dashboardApi,
  reportsApi,
  papersApi,
  alertsApi,
  type DashboardStats,
  type ReportOut,
  type SavedPaperOut,
  type AlertOut,
  type AlertNotificationOut,
} from "@/lib/api";

const REPORT_TOPICS = [
  "Large language models", "Protein structure prediction",
  "Reinforcement learning", "Diffusion models",
];

/* ── Types ──────────────────────────────────────────────────────────────── */
type Tab = "overview" | "search" | "reports" | "library" | "alerts";

const QUICK_TOPICS = [
  "Large language models", "Protein structure prediction",
  "Reinforcement learning", "Diffusion models",
  "AI safety & alignment",  "Robotics & embodied AI",
];

/* ── Relative time helper ───────────────────────────────────────────────── */
function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/* ── Sidebar nav item ───────────────────────────────────────────────────── */
function NavItem({
  icon, label, tab, active, onClick,
}: {
  icon: React.ReactNode;
  label: string;
  tab: Tab;
  active: boolean;
  onClick: (t: Tab) => void;
}) {
  return (
    <button
      onClick={() => onClick(tab)}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left ${
        active
          ? "bg-[#1a3a35] dark:bg-dark-surface-2 text-[#EDEADE] dark:text-dark-text"
          : "text-[#4a7c6f] dark:text-dark-muted hover:text-[#1a3a35] dark:hover:text-dark-text hover:bg-black/5"
      }`}
    >
      <span className={active ? "opacity-90" : "opacity-70"}>{icon}</span>
      {label}
    </button>
  );
}

/* ── Icons ──────────────────────────────────────────────────────────────── */
const Icons = {
  overview: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
      <rect x="9" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
      <rect x="1" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
      <rect x="9" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  ),
  search: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  reports: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="1" width="12" height="14" rx="2" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M5 5h6M5 8h6M5 11h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  library: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M2 3h3v10H2zM6.5 3h3v10h-3zM11 3l3 .5v9l-3-.5V3z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
    </svg>
  ),
  alerts: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M8 2a5 5 0 015 5v2.5l1.5 2H1.5L3 9.5V7a5 5 0 015-5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M6.5 13.5a1.5 1.5 0 003 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  arrow: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M2.5 7h9M8 3.5L11.5 7 8 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  external: (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M5 2H2v8h8V7M7 1h4v4M6 6l5-5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  plus: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M7 1.5v11M1.5 7h11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  ),
  close: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
};

/* ── Overview panel ─────────────────────────────────────────────────────── */
function Overview({
  firstName, stats, loadingStats,
}: {
  firstName: string;
  stats: DashboardStats | null;
  loadingStats: boolean;
}) {
  const [query, setQuery] = useState("");
  const router = useRouter();

  const handleSearch = () => {
    if (!query.trim()) return;
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  const displayStats = stats?.stats ?? [
    { label: "Searches",       value: "—",    delta: "Loading…" },
    { label: "Reports saved",  value: "—",    delta: "Loading…" },
    { label: "Papers indexed", value: "50K+", delta: "Live feed" },
    { label: "Active alerts",  value: "—",    delta: "Loading…" },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome + search */}
      <div className="bg-[#1a3a35] dark:bg-dark-surface-2 rounded-2xl p-6 sm:p-8">
        <h1 className="font-display text-2xl sm:text-3xl text-[#EDEADE] dark:text-dark-text mb-1">
          Welcome back, {firstName} 👋
        </h1>
        <p className="text-[#99ada7] dark:text-[#8fada4] text-sm mb-6">
          What are you researching today?
        </p>
        <div className="bg-[#EDEADE]/10 dark:bg-white/10 backdrop-blur rounded-xl border border-[#EDEADE]/10 dark:border-white/10 px-4 py-3 flex items-center gap-3">
          <span className="text-[#99ada7] dark:text-[#8fada4] opacity-70">{Icons.search}</span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Ask anything — e.g. 'Latest advances in RAG systems'"
            className="flex-1 bg-transparent text-[#EDEADE] dark:text-dark-text placeholder-[#99ada7]/60 dark:placeholder-[#5f7d76]/60 text-sm outline-none"
          />
          <button
            onClick={handleSearch}
            className="w-8 h-8 rounded-full bg-[#EDEADE]/15 dark:bg-white/10 hover:bg-[#EDEADE]/25 flex items-center justify-center transition-colors text-[#EDEADE] dark:text-dark-text flex-shrink-0"
          >
            {Icons.arrow}
          </button>
        </div>
        {/* Quick topics */}
        <div className="mt-4 flex flex-wrap gap-2">
          {QUICK_TOPICS.map((t) => (
            <button
              key={t}
              onClick={() => router.push(`/search?q=${encodeURIComponent(t)}`)}
              className="text-xs px-3 py-1.5 rounded-full bg-[#EDEADE]/10 dark:bg-white/10 hover:bg-[#EDEADE]/20 text-[#c5d4cf] dark:text-[#c5d4cf] transition-colors border border-[#EDEADE]/10 dark:border-white/10"
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {displayStats.map((s) => (
          <div key={s.label} className="bg-white dark:bg-dark-surface border border-[#e4e0d4] dark:border-dark-border rounded-2xl p-4 sm:p-5">
            <p className="text-2xl sm:text-3xl font-display font-semibold text-[#1a3a35] dark:text-dark-text">{s.value}</p>
            <p className="text-sm font-medium text-[#1a3a35] dark:text-dark-text mt-1">{s.label}</p>
            <p className="text-xs text-[#4a7c6f] dark:text-dark-muted mt-0.5">{s.delta}</p>
          </div>
        ))}
      </div>

      {/* Recent searches + alerts side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent searches */}
        <div className="bg-white dark:bg-dark-surface border border-[#e4e0d4] dark:border-dark-border rounded-2xl p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-[#1a3a35] dark:text-dark-text text-sm">Recent Searches</h2>
            <Link href="/search" className="text-xs text-[#4a7c6f] dark:text-dark-muted hover:text-[#1a3a35] dark:hover:text-dark-text transition-colors flex items-center gap-1">
              New search {Icons.arrow}
            </Link>
          </div>
          {loadingStats ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-[#f5f3ee] dark:bg-dark-surface rounded-xl animate-pulse" />)}
            </div>
          ) : stats?.recent_searches?.length ? (
            <div className="space-y-3">
              {stats.recent_searches.map((s) => (
                <Link
                  key={s.id}
                  href={`/search?q=${encodeURIComponent(s.query)}`}
                  className="flex items-start justify-between gap-3 p-3 rounded-xl hover:bg-[#f5f3ee] dark:hover:bg-white/5 transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#1a3a35] dark:text-dark-text font-medium truncate group-hover:text-[#2d5248]">{s.query}</p>
                    <p className="text-xs text-[#4a7c6f] dark:text-dark-muted mt-0.5">{relativeTime(s.created_at)} · {s.results_count} results</p>
                  </div>
                  <span className="text-[#4a7c6f] dark:text-dark-muted opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5">
                    {Icons.external}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#4a7c6f] dark:text-dark-muted py-6 text-center">No searches yet. Try searching above!</p>
          )}
        </div>

        {/* Alerts preview */}
        <div className="bg-white dark:bg-dark-surface border border-[#e4e0d4] dark:border-dark-border rounded-2xl p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-[#1a3a35] dark:text-dark-text text-sm">
              Alerts
              {!!stats?.alerts?.filter((a) => !a.is_read).length && (
                <span className="ml-2 inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#1a3a35] dark:bg-dark-surface-2 text-[#EDEADE] dark:text-dark-text text-[9px] font-bold">
                  {stats.alerts.filter((a) => !a.is_read).length}
                </span>
              )}
            </h2>
            <span className="text-xs text-[#4a7c6f] dark:text-dark-muted">{stats?.alerts?.length ?? 0} recent</span>
          </div>
          {loadingStats ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-[#f5f3ee] dark:bg-dark-surface rounded-xl animate-pulse" />)}
            </div>
          ) : stats?.alerts?.length ? (
            <div className="space-y-2">
              {stats.alerts.slice(0, 3).map((a) => (
                <div key={a.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-[#f5f3ee] dark:hover:bg-white/5 transition-colors cursor-pointer">
                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${!a.is_read ? "bg-[#1a3a35] dark:bg-dark-surface-2" : "bg-[#c8c4b4] dark:bg-dark-border"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[#4a7c6f] dark:text-dark-muted uppercase tracking-wide">{a.source}</p>
                    <p className="text-sm text-[#1a3a35] dark:text-dark-text leading-snug mt-0.5">{a.title}</p>
                    <p className="text-xs text-[#4a7c6f] dark:text-dark-muted mt-0.5">{relativeTime(a.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#4a7c6f] dark:text-dark-muted py-6 text-center">No alerts yet. Set one up in the Alerts tab.</p>
          )}
        </div>
      </div>

      {/* Saved reports */}
      <div className="bg-white dark:bg-dark-surface border border-[#e4e0d4] dark:border-dark-border rounded-2xl p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-[#1a3a35] dark:text-dark-text text-sm">Saved Reports</h2>
          <span className="text-xs text-[#4a7c6f] dark:text-dark-muted">{stats?.saved_reports?.length ?? 0} reports</span>
        </div>
        {loadingStats ? (
          <div className="space-y-3">
            {[1, 2].map((i) => <div key={i} className="h-14 bg-[#f5f3ee] dark:bg-dark-surface rounded-xl animate-pulse" />)}
          </div>
        ) : stats?.saved_reports?.length ? (
          <div className="space-y-3">
            {stats.saved_reports.map((r) => (
              <Link
                key={r.id}
                href={`/reports/${r.id}`}
                className="flex items-center justify-between gap-4 p-3 rounded-xl hover:bg-[#f5f3ee] dark:hover:bg-white/5 transition-colors cursor-pointer group"
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-[#f5f3ee] dark:bg-dark-surface border border-[#e4e0d4] dark:border-dark-border flex items-center justify-center flex-shrink-0 text-[#4a7c6f] dark:text-dark-muted">
                    {Icons.reports}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#1a3a35] dark:text-dark-text truncate">{r.title}</p>
                    <p className="text-xs text-[#4a7c6f] dark:text-dark-muted mt-0.5">{formatDate(r.created_at)} · {r.pages} pages</p>
                  </div>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full bg-[#f5f3ee] dark:bg-dark-surface text-[#4a7c6f] dark:text-dark-muted border border-[#e4e0d4] dark:border-dark-border hidden sm:block flex-shrink-0">
                  {r.tag}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[#4a7c6f] dark:text-dark-muted py-6 text-center">No reports yet. Reports you save from search appear here.</p>
        )}
      </div>
    </div>
  );
}

/* ── Search panel (quick jump — full experience lives on /search) ────────── */
function SearchPanel({ stats, loadingStats }: { stats: DashboardStats | null; loadingStats: boolean }) {
  const [query, setQuery] = useState("");
  const router = useRouter();

  const goSearch = (q: string) => {
    if (!q.trim()) return;
    router.push(`/search?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl text-[#1a3a35] dark:text-dark-text mb-1">AI Research Search</h2>
        <p className="text-sm text-[#4a7c6f] dark:text-dark-muted">Search across 50,000+ papers, blogs, and releases — every answer is sourced.</p>
      </div>
      <div className="bg-white dark:bg-dark-surface border border-[#e4e0d4] dark:border-dark-border rounded-2xl p-5">
        <div className="flex items-center gap-3 border border-[#e0ddd0] dark:border-dark-border rounded-xl px-4 py-3 focus-within:border-[#1a3a35] transition-colors">
          <span className="text-[#4a7c6f] dark:text-dark-muted">{Icons.search}</span>
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && goSearch(query)}
            placeholder="Ask a question about AI, biology, physics…"
            className="flex-1 bg-transparent text-[#1a3a35] dark:text-dark-text placeholder-[#b0ad9e] dark:placeholder-[#5f7d76] text-sm outline-none"
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {QUICK_TOPICS.map((t) => (
            <button
              key={t}
              onClick={() => goSearch(t)}
              className="text-xs px-3 py-1.5 rounded-full bg-[#f5f3ee] dark:bg-dark-surface hover:bg-[#eae7df] dark:hover:bg-white/5 text-[#4a7c6f] dark:text-dark-muted hover:text-[#1a3a35] dark:hover:text-dark-text transition-colors border border-[#e4e0d4] dark:border-dark-border"
            >
              {t}
            </button>
          ))}
        </div>
        <button
          onClick={() => goSearch(query)}
          className="mt-4 w-full bg-[#1a3a35] dark:bg-dark-surface-2 text-[#EDEADE] dark:text-dark-text text-sm font-medium py-2.5 rounded-xl hover:bg-[#2d5248] transition-colors"
        >
          Search
        </button>
      </div>
      <div className="bg-white dark:bg-dark-surface border border-[#e4e0d4] dark:border-dark-border rounded-2xl p-5 sm:p-6">
        <h3 className="font-semibold text-[#1a3a35] dark:text-dark-text text-sm mb-4">Recent Searches</h3>
        {loadingStats ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <div key={i} className="h-10 bg-[#f5f3ee] dark:bg-dark-surface rounded-xl animate-pulse" />)}
          </div>
        ) : stats?.recent_searches?.length ? (
          <div className="space-y-2">
            {stats.recent_searches.map((s) => (
              <Link
                key={s.id}
                href={`/search?q=${encodeURIComponent(s.query)}`}
                className="flex items-center justify-between gap-3 p-3 rounded-xl hover:bg-[#f5f3ee] dark:hover:bg-white/5 transition-colors group"
              >
                <div>
                  <p className="text-sm text-[#1a3a35] dark:text-dark-text font-medium">{s.query}</p>
                  <p className="text-xs text-[#4a7c6f] dark:text-dark-muted mt-0.5">{relativeTime(s.created_at)} · {s.results_count} results</p>
                </div>
                <span className="text-[#4a7c6f] dark:text-dark-muted opacity-0 group-hover:opacity-100 transition-opacity">{Icons.arrow}</span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[#4a7c6f] dark:text-dark-muted py-4 text-center">No searches yet.</p>
        )}
      </div>
    </div>
  );
}

/* ── Reports panel ─────────────────────────────────────────────────────── */
function ReportsPanel({ token }: { token: string }) {
  const router = useRouter();
  const toast = useToast();
  const [reports, setReports] = useState<ReportOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGenerate, setShowGenerate] = useState(false);
  const [genQuery, setGenQuery] = useState("");
  const [generating, setGenerating] = useState(false);

  const loadReports = useCallback(() => {
    if (!token) return;
    setLoading(true);
    reportsApi.getAll(token).then(setReports).catch(() => setReports([])).finally(() => setLoading(false));
  }, [token]);

  useEffect(() => { loadReports(); }, [loadReports]);

  async function handleGenerate(topic?: string) {
    const q = (topic ?? genQuery).trim();
    if (!q || generating || !token) return;
    setGenerating(true);
    try {
      const report = await reportsApi.generate(token, { query: q });
      toast.success("Report generated");
      setShowGenerate(false);
      setGenQuery("");
      router.push(`/reports/${report.id}`);
    } catch {
      toast.error("Couldn't generate the report. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl text-[#1a3a35] dark:text-dark-text mb-1">Reports</h2>
          <p className="text-sm text-[#4a7c6f] dark:text-dark-muted">In-depth automated literature reviews, saved and ready.</p>
        </div>
        <button
          onClick={() => setShowGenerate((v) => !v)}
          className="flex-shrink-0 bg-[#1a3a35] dark:bg-dark-surface-2 text-[#EDEADE] dark:text-dark-text text-sm font-medium px-4 py-2 rounded-xl hover:bg-[#2d5248] transition-colors"
        >
          + New report
        </button>
      </div>

      {showGenerate && (
        <div className="bg-white dark:bg-dark-surface border border-[#e4e0d4] dark:border-dark-border rounded-2xl p-5">
          <p className="text-sm font-semibold text-[#1a3a35] dark:text-dark-text mb-1">What should this report cover?</p>
          <p className="text-xs text-[#4a7c6f] dark:text-dark-muted mb-3">Synaptara will search the topic and compile the results into a saved report.</p>
          <div className="flex items-center gap-2">
            <input
              autoFocus
              type="text"
              value={genQuery}
              onChange={(e) => setGenQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
              placeholder="e.g. Diffusion model architectures"
              disabled={generating}
              className="flex-1 bg-[#f5f3ee] dark:bg-dark-bg border border-[#e0ddd0] dark:border-dark-border rounded-xl px-4 py-2.5 text-sm text-[#1a3a35] dark:text-dark-text placeholder-[#b0ad9e] dark:placeholder-[#5f7d76] outline-none focus:border-[#1a3a35] transition-colors disabled:opacity-60"
            />
            <button
              onClick={() => handleGenerate()}
              disabled={generating || !genQuery.trim()}
              className="flex-shrink-0 bg-[#1a3a35] dark:bg-dark-surface-2 text-[#EDEADE] dark:text-dark-text text-sm font-medium px-4 py-2.5 rounded-xl hover:bg-[#2d5248] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating ? "Generating…" : "Generate"}
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {REPORT_TOPICS.map((t) => (
              <button
                key={t}
                onClick={() => { setGenQuery(t); handleGenerate(t); }}
                disabled={generating}
                className="text-xs px-3 py-1.5 rounded-full bg-[#f5f3ee] dark:bg-dark-bg hover:bg-[#eae7df] dark:hover:bg-white/5 text-[#4a7c6f] dark:text-dark-muted hover:text-[#1a3a35] dark:hover:text-dark-text transition-colors border border-[#e4e0d4] dark:border-dark-border disabled:opacity-50"
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-white dark:bg-dark-surface border border-[#e4e0d4] dark:border-dark-border rounded-2xl animate-pulse" />)}
        </div>
      ) : reports.length > 0 ? (
        <div className="space-y-3">
          {reports.map((r) => (
            <Link
              key={r.id}
              href={`/reports/${r.id}`}
              className="bg-white dark:bg-dark-surface border border-[#e4e0d4] dark:border-dark-border rounded-2xl p-5 flex items-center justify-between gap-4 hover:border-[#c8c4b4] transition-colors cursor-pointer group"
            >
              <div className="flex items-start gap-4 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-[#f5f3ee] dark:bg-dark-surface border border-[#e4e0d4] dark:border-dark-border flex items-center justify-center flex-shrink-0 text-[#4a7c6f] dark:text-dark-muted">
                  {Icons.reports}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[#1a3a35] dark:text-dark-text text-sm">{r.title}</p>
                  <p className="text-xs text-[#4a7c6f] dark:text-dark-muted mt-1">{formatDate(r.created_at)} · {r.pages} pages</p>
                  <span className="mt-2 inline-block text-xs px-2.5 py-0.5 rounded-full bg-[#f5f3ee] dark:bg-dark-surface text-[#4a7c6f] dark:text-dark-muted border border-[#e4e0d4] dark:border-dark-border">{r.tag}</span>
                </div>
              </div>
              <span className="text-[#4a7c6f] dark:text-dark-muted opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">{Icons.arrow}</span>
            </Link>
          ))}
        </div>
      ) : null}

      {!loading && reports.length === 0 && !showGenerate && (
        <div className="bg-white dark:bg-dark-surface border border-dashed border-[#c8c4b4] dark:border-dark-border rounded-2xl p-8 text-center">
          <div className="w-10 h-10 rounded-xl bg-[#f5f3ee] dark:bg-dark-surface border border-[#e4e0d4] dark:border-dark-border flex items-center justify-center mx-auto mb-3 text-[#4a7c6f] dark:text-dark-muted">
            {Icons.reports}
          </div>
          <p className="font-semibold text-[#1a3a35] dark:text-dark-text text-sm">Generate a new report</p>
          <p className="text-xs text-[#4a7c6f] dark:text-dark-muted mt-1 mb-4">Enter a topic and Synaptara will compile a full literature review for you.</p>
          <button
            onClick={() => setShowGenerate(true)}
            className="bg-[#1a3a35] dark:bg-dark-surface-2 text-[#EDEADE] dark:text-dark-text text-sm font-medium px-5 py-2 rounded-xl hover:bg-[#2d5248] transition-colors"
          >
            Start a report
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Library panel ─────────────────────────────────────────────────────── */
function LibraryPanel({ token }: { token: string }) {
  const [papers, setPapers] = useState<SavedPaperOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState("All");
  const toast = useToast();

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    papersApi.getSaved(token).then(setPapers).catch(() => setPapers([])).finally(() => setLoading(false));
  }, [token]);

  const handleRemove = async (id: string) => {
    try {
      await papersApi.remove(token, id);
      setPapers((prev) => prev.filter((p) => p.id !== id));
      toast.success("Removed from Library");
    } catch {
      toast.error("Couldn't remove the paper");
    }
  };

  const tags = ["All", ...Array.from(new Set(papers.map((p) => p.tag)))];
  const filtered = active === "All" ? papers : papers.filter((p) => p.tag === active);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl text-[#1a3a35] dark:text-dark-text mb-1">Library</h2>
        <p className="text-sm text-[#4a7c6f] dark:text-dark-muted">A home for all your saved papers, summaries, and research.</p>
      </div>

      {!loading && papers.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {tags.map((t) => (
            <button
              key={t}
              onClick={() => setActive(t)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                active === t
                  ? "bg-[#1a3a35] dark:bg-dark-surface-2 text-[#EDEADE] dark:text-dark-text border-[#1a3a35] dark:border-dark-border"
                  : "bg-white dark:bg-dark-surface text-[#4a7c6f] dark:text-dark-muted border-[#e4e0d4] dark:border-dark-border hover:border-[#1a3a35] hover:text-[#1a3a35] dark:hover:text-dark-text"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-white dark:bg-dark-surface border border-[#e4e0d4] dark:border-dark-border rounded-2xl animate-pulse" />)}
        </div>
      ) : filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map((p) => (
            <div key={p.id} className="bg-white dark:bg-dark-surface border border-[#e4e0d4] dark:border-dark-border rounded-2xl p-4 sm:p-5 flex items-center gap-4 hover:border-[#c8c4b4] transition-colors group">
              <div className="w-9 h-9 rounded-lg bg-[#f5f3ee] dark:bg-dark-surface border border-[#e4e0d4] dark:border-dark-border flex items-center justify-center flex-shrink-0 text-[#4a7c6f] dark:text-dark-muted">
                {Icons.library}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-[#1a3a35] dark:text-dark-text text-sm truncate">{p.title}</p>
                <p className="text-xs text-[#4a7c6f] dark:text-dark-muted mt-0.5">{p.source} · {p.year} · {p.tag}</p>
              </div>
              {p.paper_url && (
                <a
                  href={p.paper_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#4a7c6f] dark:text-dark-muted opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                  title="Open paper"
                >
                  {Icons.external}
                </a>
              )}
              <button
                onClick={() => handleRemove(p.id)}
                className="flex-shrink-0 p-1.5 rounded-lg text-[#c8c4b4] dark:text-[#5f7d76] hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                title="Remove from library"
              >
                {Icons.close}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-dark-surface border border-dashed border-[#c8c4b4] dark:border-dark-border rounded-2xl p-8 text-center">
          <p className="font-semibold text-[#1a3a35] dark:text-dark-text text-sm">Your library grows as you search</p>
          <p className="text-xs text-[#4a7c6f] dark:text-dark-muted mt-1">Save papers and summaries from search results to find them here.</p>
        </div>
      )}
    </div>
  );
}

/* ── Alerts panel ───────────────────────────────────────────────────────── */
function AlertsPanel({ token }: { token: string }) {
  const [notifications, setNotifications] = useState<AlertNotificationOut[]>([]);
  const [subscriptions, setSubscriptions] = useState<AlertOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newSource, setNewSource] = useState("arXiv");
  const [newQuery, setNewQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const toast = useToast();

  const availableSources = ["arXiv", "PubMed", "OpenAI", "DeepMind", "Anthropic"];

  const load = useCallback(() => {
    if (!token) return;
    setLoading(true);
    Promise.all([alertsApi.getNotifications(token), alertsApi.getAll(token)])
      .then(([notifs, subs]) => { setNotifications(notifs); setSubscriptions(subs); })
      .catch(() => { setNotifications([]); setSubscriptions([]); })
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!newQuery.trim() || creating) return;
    setCreating(true);
    try {
      await alertsApi.create(token, { source: newSource, query: newQuery.trim() });
      setNewQuery("");
      setShowForm(false);
      load();
      toast.success("Alert created ✓");
    } catch {
      toast.error("Failed to create alert");
    }
    finally { setCreating(false); }
  };

  const markRead = async (id: string) => {
    try {
      await alertsApi.markRead(token, id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    } catch { /* ignore */ }
  };

  const handleDelete = async (alertId: string) => {
    try {
      await alertsApi.delete(token, alertId);
      setSubscriptions((prev) => prev.filter((s) => s.id !== alertId));
      setNotifications((prev) => prev.filter((n) => n.alert_id !== alertId));
      toast.success("Alert deleted");
    } catch {
      toast.error("Couldn't delete alert");
    }
  };

  const markAlertNotificationsRead = (alertId: string) => {
    const unread = notifications.filter((n) => n.alert_id === alertId && !n.is_read);
    unread.forEach((n) => markRead(n.id));
  };

  const monitoredSources = subscriptions.length
    ? Array.from(new Set(subscriptions.map((s) => s.source)))
    : availableSources;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl text-[#1a3a35] dark:text-dark-text mb-1">Alerts</h2>
          <p className="text-sm text-[#4a7c6f] dark:text-dark-muted">Stay updated when new research matching your topics is published.</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex-shrink-0 bg-[#1a3a35] dark:bg-dark-surface-2 text-[#EDEADE] dark:text-dark-text text-sm font-medium px-4 py-2 rounded-xl hover:bg-[#2d5248] transition-colors flex items-center gap-1.5"
        >
          {showForm ? Icons.close : Icons.plus} {showForm ? "Cancel" : "New alert"}
        </button>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-dark-surface border border-[#e4e0d4] dark:border-dark-border rounded-2xl p-5 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={newSource}
              onChange={(e) => setNewSource(e.target.value)}
              className="border border-[#dedad0] dark:border-dark-border rounded-xl px-3 py-2.5 text-sm text-[#1a3a35] dark:text-dark-text outline-none focus:border-[#4a7c6f] bg-white dark:bg-dark-surface sm:w-40"
            >
              {availableSources.map((s) => <option key={s}>{s}</option>)}
            </select>
            <input
              type="text"
              value={newQuery}
              onChange={(e) => setNewQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              placeholder="Topic to watch — e.g. 'RAG retrieval'"
              className="flex-1 border border-[#dedad0] dark:border-dark-border rounded-xl px-4 py-2.5 text-sm text-[#1a3a35] dark:text-dark-text placeholder-[#b0ad9e] dark:placeholder-[#5f7d76] outline-none focus:border-[#4a7c6f]"
            />
            <button
              onClick={handleCreate}
              disabled={creating || !newQuery.trim()}
              className="bg-[#1a3a35] dark:bg-dark-surface-2 text-[#EDEADE] dark:text-dark-text text-sm font-medium px-5 py-2.5 rounded-xl hover:bg-[#2d5248] transition-colors disabled:opacity-50"
            >
              {creating ? "Creating…" : "Create"}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-white dark:bg-dark-surface border border-[#e4e0d4] dark:border-dark-border rounded-2xl animate-pulse" />)}
        </div>
      ) : subscriptions.length > 0 ? (
        <div className="space-y-3">
          {subscriptions.map((s) => {
            const unreadForAlert = notifications.filter((n) => n.alert_id === s.id && !n.is_read);
            return (
              <div
                key={s.id}
                onClick={() => unreadForAlert.length > 0 && markAlertNotificationsRead(s.id)}
                className={`bg-white dark:bg-dark-surface border rounded-2xl p-4 sm:p-5 flex items-start gap-4 hover:border-[#c8c4b4] transition-colors group ${unreadForAlert.length > 0 ? "cursor-pointer border-[#1a3a35]/30 dark:border-white/20" : "border-[#e4e0d4] dark:border-dark-border"}`}
              >
                <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0 bg-[#1a3a35] dark:bg-dark-surface-2" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold text-[#4a7c6f] dark:text-dark-muted uppercase tracking-widest">{s.source}</p>
                  <p className="text-sm font-medium text-[#1a3a35] dark:text-dark-text mt-0.5">{s.query}</p>
                  <p className="text-xs text-[#4a7c6f] dark:text-dark-muted mt-1">
                    Created {relativeTime(s.created_at)}
                    {unreadForAlert.length > 0 && ` · ${unreadForAlert.length} new match${unreadForAlert.length > 1 ? "es" : ""}`}
                  </p>
                </div>
                {unreadForAlert.length > 0 && (
                  <span className="flex-shrink-0 text-xs px-2 py-0.5 rounded-full bg-[#1a3a35] dark:bg-dark-surface-2 text-[#EDEADE] dark:text-dark-text">New</span>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(s.id); }}
                  className="flex-shrink-0 p-1.5 rounded-lg text-[#c8c4b4] dark:text-[#5f7d76] hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                  title="Delete alert"
                >
                  {Icons.close}
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white dark:bg-dark-surface border border-dashed border-[#c8c4b4] dark:border-dark-border rounded-2xl p-8 text-center">
          <p className="font-semibold text-[#1a3a35] dark:text-dark-text text-sm">No alerts yet</p>
          <p className="text-xs text-[#4a7c6f] dark:text-dark-muted mt-1">Create one above to get notified about new matching research.</p>
        </div>
      )}

      <div className="bg-white dark:bg-dark-surface border border-[#e4e0d4] dark:border-dark-border rounded-2xl p-5 sm:p-6">
        <h3 className="font-semibold text-[#1a3a35] dark:text-dark-text text-sm mb-3">Monitored sources</h3>
        <div className="flex flex-wrap gap-2">
          {monitoredSources.map((s) => (
            <span key={s} className="text-xs px-3 py-1.5 rounded-full bg-[#f5f3ee] dark:bg-dark-surface text-[#4a7c6f] dark:text-dark-muted border border-[#e4e0d4] dark:border-dark-border">
              {s}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Main dashboard ─────────────────────────────────────────────────────── */
const VALID_TABS: Tab[] = ["overview", "search", "reports", "library", "alerts"];

function isValidTab(value: string | null): value is Tab {
  return value !== null && (VALID_TABS as string[]).includes(value);
}

function DashboardContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  // The URL is the single source of truth for the active tab — there is no
  // separate `activeTab` state to keep in sync, so there's nothing that can
  // drift or need a workaround effect. Unknown/invalid ?tab values fall back
  // to "overview" on every render, including right after Back/Forward.
  const tabParam = searchParams.get("tab");
  const activeTab: Tab = isValidTab(tabParam) ? tabParam : "overview";

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  const token = (session?.user as Record<string, unknown> | undefined)?.accessToken as string | undefined;

  // Navigates to a tab by pushing a new history entry (not replace), so
  // Back/Forward have actual states to move between.
  const goToTab = useCallback((tab: Tab) => {
    router.push(tab === "overview" ? "/dashboard" : `/dashboard?tab=${tab}`, { scroll: false });
  }, [router]);

  useEffect(() => {
    if (status === "unauthenticated") {
      const callbackUrl = `/dashboard${activeTab !== "overview" ? `?tab=${activeTab}` : ""}`;
      router.replace(`/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
    }
  }, [status, router, activeTab]);

  useEffect(() => {
    if (!token) return;
    setLoadingStats(true);
    dashboardApi.getStats(token)
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setLoadingStats(false));
  }, [token]);

  if (status === "loading" || !session) {
    return <FullPageLoader label="Loading your dashboard…" />;
  }

  const firstName = session.user?.name?.split(" ")[0] ?? "Researcher";

  const NAV_ITEMS: { tab: Tab; icon: React.ReactNode; label: string }[] = [
    { tab: "overview", icon: Icons.overview, label: "Overview"  },
    { tab: "search",   icon: Icons.search,   label: "Search"    },
    { tab: "reports",  icon: Icons.reports,  label: "Reports"   },
    { tab: "library",  icon: Icons.library,  label: "Library"   },
    { tab: "alerts",   icon: Icons.alerts,   label: "Alerts"    },
  ];

  return (
    <div className="min-h-screen bg-[#EDEADE] dark:bg-dark-bg flex flex-col">

      {/* ── Top nav bar ───────────────────────────────────────────────────── */}
      <header className="w-full bg-[#EDEADE] dark:bg-dark-bg border-b border-[#dedad0] dark:border-dark-border px-4 sm:px-6 h-14 flex items-center justify-between z-30 sticky top-0">
        <div className="flex items-center gap-3">
          {/* Mobile hamburger */}
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="lg:hidden p-1.5 text-[#1a3a35] dark:text-dark-text rounded-lg hover:bg-black/5 transition-colors"
            aria-label="Toggle sidebar"
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
            {session.user?.email}
          </span>
          <ProfileDropdown firstName={firstName} email={session.user?.email ?? ""} showBackOnMobile={false} />
        </div>
      </header>

      <div className="flex flex-1 relative">

        {/* ── Mobile overlay ────────────────────────────────────────────── */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/20 z-20 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* ── Sidebar ───────────────────────────────────────────────────── */}
        <aside
          role={sidebarOpen ? "dialog" : undefined}
          aria-modal={sidebarOpen ? "true" : undefined}
          aria-label="Dashboard navigation"
          className={`
          fixed lg:sticky top-14 left-0 h-[calc(100vh-3.5rem)] w-56 bg-[#EDEADE] dark:bg-dark-bg border-r border-[#dedad0] dark:border-dark-border
          flex flex-col z-20 transition-transform duration-200
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}>
          {/* Mobile-only header: close button. Hidden on desktop, where the
              sidebar is always visible and there's nothing to "close". */}
          <div className="lg:hidden flex items-center justify-between px-3 pt-3 pb-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-[#4a7c6f] dark:text-dark-muted px-1">
              Menu
            </span>
            <button
              onClick={() => setSidebarOpen(false)}
              aria-label="Close navigation"
              className="p-2 -mr-1 rounded-lg text-[#1a3a35] dark:text-dark-text hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
            {NAV_ITEMS.map((item) => (
              <NavItem
                key={item.tab}
                {...item}
                active={activeTab === item.tab}
                onClick={(t) => {
                  goToTab(t);
                  setSidebarOpen(false);
                }}
              />
            ))}
          </div>

          {/* Upgrade card */}
          <div className="p-3 border-t border-[#dedad0] dark:border-dark-border">
            <Link
              href="/pricing"
              className="block bg-[#1a3a35]/5 dark:bg-white/5 hover:bg-[#1a3a35]/10 border border-[#1a3a35]/10 dark:border-white/10 rounded-xl p-3 transition-colors"
            >
              <p className="text-xs font-semibold text-[#1a3a35] dark:text-dark-text">Upgrade to Pro</p>
              <p className="text-xs text-[#4a7c6f] dark:text-dark-muted mt-0.5 leading-snug">Unlock unlimited research & reports</p>
            </Link>
          </div>
        </aside>

        {/* ── Main content ──────────────────────────────────────────────── */}
        <main
          // Keeps the content behind the mobile sidebar out of the tab order
          // and hidden from screen readers while the overlay is open — the
          // backdrop already blocks pointer/click interaction.
          inert={sidebarOpen ? true : undefined}
          className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-6 sm:py-8 overflow-auto"
        >
          <div className="max-w-4xl mx-auto">
            {activeTab === "overview" && <Overview firstName={firstName} stats={stats} loadingStats={loadingStats} />}
            {activeTab === "search"   && <SearchPanel stats={stats} loadingStats={loadingStats} />}
            {activeTab === "reports"  && <ReportsPanel token={token ?? ""} />}
            {activeTab === "library"  && <LibraryPanel token={token ?? ""} />}
            {activeTab === "alerts"   && <AlertsPanel token={token ?? ""} />}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#EDEADE] dark:bg-dark-bg flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#1a3a35] dark:border-dark-border border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
