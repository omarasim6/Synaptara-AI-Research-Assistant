import Link from "next/link";
import Image from "next/image";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#EDEADE] dark:bg-dark-bg flex flex-col items-center justify-center px-4 sm:px-6 py-12 text-center">
      <Link href="/" className="flex items-center gap-2 mb-10">
        <Image src="/icon.png" alt="Synaptara" width={32} height={32} className="rounded-xl" />
        <span className="font-display text-lg sm:text-xl font-semibold text-[#1a3a35] dark:text-dark-text">
          Synaptara
        </span>
      </Link>

      <div className="w-full max-w-sm bg-white dark:bg-dark-surface border border-[#e4e0d4] dark:border-dark-border rounded-2xl shadow-sm p-8 sm:p-10">
        <div className="w-14 h-14 rounded-2xl bg-[#f5f3ee] dark:bg-dark-surface-2 border border-[#e4e0d4] dark:border-dark-border flex items-center justify-center mx-auto mb-5 text-[#4a7c6f] dark:text-dark-muted">
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.6" />
            <path d="M15.5 15.5L20 20" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M7.5 10h5M10 7.5v5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.5" />
          </svg>
        </div>

        <p className="font-display text-5xl sm:text-6xl font-semibold text-[#1a3a35] dark:text-dark-text mb-2">
          404
        </p>
        <h1 className="text-base sm:text-lg font-semibold text-[#1a3a35] dark:text-dark-text mb-1.5">
          Page not found
        </h1>
        <p className="text-sm text-[#4a7c6f] dark:text-dark-muted leading-relaxed mb-7">
          The page you&apos;re looking for doesn&apos;t exist or may have been moved.
        </p>

        <div className="flex flex-col sm:flex-row gap-2.5">
          <Link
            href="/"
            className="flex-1 flex items-center justify-center gap-2 bg-[#1a3a35] dark:bg-dark-surface-2 text-[#EDEADE] dark:text-dark-text text-sm font-medium px-4 py-2.5 rounded-xl hover:bg-[#2d5248] active:bg-[#132e29] transition-colors"
          >
            Go home
          </Link>
          <Link
            href="/search"
            className="flex-1 flex items-center justify-center gap-2 bg-white dark:bg-dark-surface border border-[#dedad0] dark:border-dark-border text-[#1a3a35] dark:text-dark-text text-sm font-medium px-4 py-2.5 rounded-xl hover:bg-[#f5f3ee] dark:hover:bg-white/5 transition-colors"
          >
            Go to search
          </Link>
        </div>
      </div>
    </div>
  );
}
