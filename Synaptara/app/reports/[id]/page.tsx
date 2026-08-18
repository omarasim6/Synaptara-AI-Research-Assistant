"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import ProfileDropdown from "@/app/components/ProfileDropdown";
import FullPageLoader from "@/app/components/FullPageLoader";
import MarkdownLite from "@/app/components/assistant/MarkdownLite";
import { useToast } from "@/providers/ToastProvider";
import { reportsApi, type ReportDetailOut } from "@/lib/api";

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const BackIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M11.5 7h-9M5 3.5L1.5 7 5 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M2.5 4h9M5.5 4V2.5h3V4M3.5 4l.5 8h6l.5-8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export default function ReportDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const toast = useToast();

  const reportId = typeof params.id === "string" ? params.id : "";
  const token = (session?.user as Record<string, unknown>)?.accessToken as string | undefined;

  const [report, setReport] = useState<ReportDetailOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(`/signin?callbackUrl=${encodeURIComponent(`/reports/${reportId}`)}`);
    }
  }, [status, router, reportId]);

  useEffect(() => {
    if (!token || !reportId) return;
    setLoading(true);
    setNotFound(false);
    reportsApi.getOne(token, reportId)
      .then(setReport)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [token, reportId]);

  async function handleDelete() {
    if (!token || !report || deleting) return;
    if (!window.confirm("Delete this report? This can't be undone.")) return;
    setDeleting(true);
    try {
      await reportsApi.delete(token, report.id);
      toast.success("Report deleted");
      router.push("/dashboard?tab=reports");
    } catch {
      toast.error("Couldn't delete the report");
      setDeleting(false);
    }
  }

  const firstName = session?.user?.name?.split(" ")[0] ?? "Researcher";

  if (status === "loading" || status === "unauthenticated") {
    return <FullPageLoader label="Loading report…" />;
  }

  return (
    <div className="min-h-screen bg-[#EDEADE] dark:bg-dark-bg flex flex-col">
      {/* Top nav */}
      <header className="w-full bg-[#EDEADE] dark:bg-dark-bg border-b border-[#dedad0] dark:border-dark-border px-4 sm:px-6 h-14 flex items-center justify-between z-30 sticky top-0">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/icon.png" alt="Synaptara" width={28} height={28} className="rounded-lg" />
          <span className="font-display text-lg font-semibold text-[#1a3a35] dark:text-dark-text">Synaptara</span>
        </Link>
        <div className="flex items-center gap-3">
          <span className="hidden sm:block text-sm text-[#4a7c6f] dark:text-dark-muted truncate max-w-[180px]">
            {session?.user?.email}
          </span>
          <ProfileDropdown firstName={firstName} email={session?.user?.email ?? ""} />
        </div>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-8">
        <button
          onClick={() => router.push("/dashboard?tab=reports")}
          className="flex items-center gap-1.5 text-xs font-medium text-[#4a7c6f] dark:text-dark-muted hover:text-[#1a3a35] dark:hover:text-dark-text transition-colors mb-6"
        >
          <BackIcon /> Back to Reports
        </button>

        {loading ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-8 w-2/3 bg-white dark:bg-dark-surface rounded-lg" />
            <div className="h-4 w-1/3 bg-white dark:bg-dark-surface rounded-lg" />
            <div className="h-64 w-full bg-white dark:bg-dark-surface rounded-2xl mt-6" />
          </div>
        ) : notFound || !report ? (
          <div className="bg-white dark:bg-dark-surface border border-[#e4e0d4] dark:border-dark-border rounded-2xl p-10 text-center">
            <p className="text-sm font-medium text-[#1a3a35] dark:text-dark-text">Report not found</p>
            <p className="text-xs text-[#4a7c6f] dark:text-dark-muted mt-1">
              It may have been deleted, or you don&apos;t have access to it.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-4 mb-2">
              <h1 className="font-display text-2xl sm:text-3xl text-[#1a3a35] dark:text-dark-text leading-snug">
                {report.title}
              </h1>
              <button
                onClick={handleDelete}
                disabled={deleting}
                title="Delete report"
                className="flex-shrink-0 p-2 rounded-lg text-[#a09c8e] dark:text-[#7d9691] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-50"
              >
                <TrashIcon />
              </button>
            </div>
            <div className="flex items-center gap-2 flex-wrap mb-8 text-xs text-[#4a7c6f] dark:text-dark-muted">
              <span className="px-2.5 py-0.5 rounded-full bg-[#f5f3ee] dark:bg-dark-surface border border-[#e4e0d4] dark:border-dark-border">
                {report.tag}
              </span>
              <span>{formatDate(report.created_at)}</span>
              <span>·</span>
              <span>{report.pages} page{report.pages !== 1 ? "s" : ""}</span>
            </div>

            <div className="bg-white dark:bg-dark-surface border border-[#e4e0d4] dark:border-dark-border rounded-2xl p-6 sm:p-8 text-sm text-[#2b2b2b] dark:text-dark-text">
              {report.content ? (
                <MarkdownLite content={report.content} />
              ) : (
                <p className="text-[#4a7c6f] dark:text-dark-muted">This report has no content.</p>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
