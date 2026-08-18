import Image from "next/image";

/**
 * Full-page branded loading state, shown while auth/session status is being
 * resolved (e.g. NextAuth's `status === "loading"`). Keeps the brand mark on
 * screen instead of a bare spinner so the page never looks broken or blank
 * during that check.
 */
export default function FullPageLoader({ label }: { label?: string }) {
  return (
    <div className="min-h-screen bg-[#EDEADE] dark:bg-dark-bg flex flex-col items-center justify-center gap-5 px-4">
      <div className="relative flex items-center justify-center">
        <span className="absolute w-14 h-14 rounded-2xl border-2 border-[#1a3a35]/15 dark:border-dark-border border-t-[#1a3a35] dark:border-t-dark-text animate-spin" />
        <Image
          src="/icon.png"
          alt="Synaptara"
          width={32}
          height={32}
          className="rounded-lg"
          priority
        />
      </div>
      <p className="text-xs font-medium tracking-wide text-[#4a7c6f] dark:text-dark-muted">
        {label ?? "Loading Synaptara…"}
      </p>
    </div>
  );
}
